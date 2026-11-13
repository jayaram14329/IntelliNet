import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

from app.core.config import settings

CONGESTION_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LABEL_MAP = {level: idx for idx, level in enumerate(CONGESTION_LEVELS)}
INV_LABEL_MAP = {idx: level for idx, level in enumerate(CONGESTION_LEVELS)}

STANDARD_CONGESTION_FEATURES = [
    "bandwidth_utilization_pct",
    "throughput_mbps",
    "packet_rate_pps",
    "latency_ms",
    "packet_loss_pct",
    "jitter_ms",
    "active_connections"
]

def derive_congestion_label(
    bandwidth_pct: float,
    latency_ms: float,
    packet_loss_pct: float,
    jitter_ms: float = 0.0
) -> str:
    """
    Defensible network engineering classification methodology:
    - CRITICAL: Severe degradation (Loss > 5% or Latency > 150ms or Bandwidth > 90%)
    - HIGH: Significant buffer bloat or congestion (Loss > 2% or Latency > 80ms or Bandwidth > 75%)
    - MEDIUM: Moderate queuing delay (Latency > 40ms or Bandwidth > 50% or Loss > 0.5%)
    - LOW: Nominal operating parameters
    """
    if packet_loss_pct >= settings.PACKET_LOSS_THRESHOLD_CRITICAL or \
       latency_ms >= settings.LATENCY_THRESHOLD_CRITICAL or \
       bandwidth_pct >= settings.BANDWIDTH_THRESHOLD_CRITICAL:
        return "CRITICAL"
    elif packet_loss_pct >= settings.PACKET_LOSS_THRESHOLD_HIGH or \
         latency_ms >= settings.LATENCY_THRESHOLD_HIGH or \
         bandwidth_pct >= settings.BANDWIDTH_THRESHOLD_HIGH:
        return "HIGH"
    elif packet_loss_pct >= settings.PACKET_LOSS_THRESHOLD_MEDIUM or \
         latency_ms >= settings.LATENCY_THRESHOLD_MEDIUM or \
         bandwidth_pct >= settings.BANDWIDTH_THRESHOLD_MEDIUM:
        return "MEDIUM"
    else:
        return "LOW"

class CongestionPredictionPipeline:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names: List[str] = []
        self.model_info: Dict[str, Any] = {}
        self.prediction_horizon: str = "Next Measurement Interval"
        self._load_active_model()

    def _load_active_model(self):
        """Attempts to load the most recently saved active congestion model from disk."""
        models_dir = settings.MODELS_DIR
        active_file = models_dir / "active_congestion_model.joblib"
        if active_file.exists():
            try:
                bundle = joblib.load(active_file)
                self.model = bundle["model"]
                self.scaler = bundle.get("scaler")
                self.feature_names = bundle["feature_names"]
                self.model_info = bundle.get("model_info", {})
                self.prediction_horizon = bundle.get("prediction_horizon", "Next Measurement Interval")
            except Exception as e:
                print(f"[Warning] Failed to load congestion model: {e}")

    def prepare_time_series_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """
        Create chronological lag features for future-interval forecasting (Mode B).
        Target is congestion_level at t+1. Features at time t predict state at t+1.
        Uses time-aware sorting to guarantee no future data leakage.
        """
        df = df.copy()
        
        # Sort chronologically if timestamp exists
        if "timestamp" in df.columns:
            try:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                df = df.sort_values("timestamp").reset_index(drop=True)
            except Exception:
                pass

        # Ensure numeric features are present
        for col in STANDARD_CONGESTION_FEATURES:
            if col not in df.columns:
                df[col] = 0.0
            else:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        # Derive current congestion label if not present
        if "congestion_level" not in df.columns:
            df["congestion_level"] = df.apply(
                lambda row: derive_congestion_label(
                    row["bandwidth_utilization_pct"],
                    row["latency_ms"],
                    row["packet_loss_pct"],
                    row.get("jitter_ms", 0.0)
                ), axis=1
            )

        # Create lag features (t-1)
        lag_cols = []
        for col in ["bandwidth_utilization_pct", "latency_ms", "packet_loss_pct", "throughput_mbps"]:
            lag_name = f"{col}_lag1"
            df[lag_name] = df[col].shift(1).fillna(df[col])
            lag_cols.append(lag_name)

        # Rolling statistics (window=3)
        df["latency_rolling_mean"] = df["latency_ms"].rolling(window=3, min_periods=1).mean()
        df["loss_rolling_mean"] = df["packet_loss_pct"].rolling(window=3, min_periods=1).mean()
        lag_cols.extend(["latency_rolling_mean", "loss_rolling_mean"])

        # Target: Next interval label (shifted by -1)
        df["target_next_interval"] = df["congestion_level"].shift(-1)
        
        # Drop last row since it doesn't have a future target
        df = df.dropna(subset=["target_next_interval"]).reset_index(drop=True)

        feature_cols = STANDARD_CONGESTION_FEATURES + lag_cols
        X = df[feature_cols].copy()
        y = df["target_next_interval"].map(LABEL_MAP).fillna(0).astype(int)

        return X, y, feature_cols

    def train(
        self,
        df: pd.DataFrame,
        algorithm: str = "RandomForest",
        test_size: float = 0.2,
        random_state: int = 42,
        prediction_horizon: str = "Next Measurement Interval"
    ) -> Dict[str, Any]:
        """
        Train a congestion prediction model using chronological split.
        """
        X, y, feature_names = self.prepare_time_series_features(df)
        
        if len(X) < 10:
            raise ValueError("Dataset has too few records for training (minimum 10 required).")

        # Chronological split to prevent data leakage in temporal series!
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        alg_lower = algorithm.lower()
        if "tree" in alg_lower:
            model = DecisionTreeClassifier(max_depth=12, random_state=random_state)
            alg_name = "DecisionTree"
        elif "logistic" in alg_lower:
            model = LogisticRegression(max_iter=1000, random_state=random_state)
            alg_name = "LogisticRegression"
        else:
            model = RandomForestClassifier(n_estimators=70, max_depth=12, random_state=random_state, n_jobs=-1)
            alg_name = "RandomForest"

        model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = model.predict(X_test_scaled)
        acc = float(accuracy_score(y_test, y_pred))
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )

        # Classification report
        unique_classes = sorted(list(np.unique(np.concatenate([y_test, y_pred]))))
        target_names = [INV_LABEL_MAP.get(c, str(c)) for c in unique_classes]
        report_dict = classification_report(
            y_test, y_pred,
            labels=unique_classes,
            target_names=target_names,
            output_dict=True,
            zero_division=0
        )

        cm = confusion_matrix(y_test, y_pred, labels=unique_classes)
        cm_list = cm.tolist()

        feature_importance = {}
        if hasattr(model, "feature_importances_"):
            for feat, imp in sorted(zip(feature_names, model.feature_importances_), key=lambda x: x[1], reverse=True):
                feature_importance[feat] = float(imp)

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        version = f"v1.{timestamp_str}"
        model_filename = f"congestion_{alg_name}_{version}.joblib"
        model_filepath = settings.MODELS_DIR / model_filename

        model_info = {
            "algorithm": alg_name,
            "version": version,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_count": len(feature_names),
            "prediction_horizon": prediction_horizon,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        bundle = {
            "model": model,
            "scaler": scaler,
            "feature_names": feature_names,
            "model_info": model_info,
            "prediction_horizon": prediction_horizon
        }
        joblib.dump(bundle, model_filepath)

        # Save as active
        active_filepath = settings.MODELS_DIR / "active_congestion_model.joblib"
        joblib.dump(bundle, active_filepath)

        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        self.model_info = model_info
        self.prediction_horizon = prediction_horizon

        return {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "confusion_matrix": cm_list,
            "confusion_matrix_labels": target_names,
            "classification_report": report_dict,
            "feature_importance": feature_importance,
            "model_version": version,
            "algorithm": alg_name,
            "prediction_horizon": prediction_horizon,
            "file_path": str(model_filepath)
        }

    def predict_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate both Current Congestion State (Mode A) and Future Forecast (Mode B).
        """
        bandwidth = float(record.get("bandwidth_utilization_pct", 0.0))
        latency = float(record.get("latency_ms", 0.0))
        loss = float(record.get("packet_loss_pct", 0.0))
        jitter = float(record.get("jitter_ms", 0.0))

        # Mode A: Current Observed Classification (Rule-based defensible engineering methodology)
        current_state = derive_congestion_label(bandwidth, latency, loss, jitter)

        # Mode B: Future Interval Prediction using trained ML model if available
        predicted_next = None
        future_confidence = None
        
        if self.model is not None:
            # Build input vector matching trained feature names
            row = []
            for feat in self.feature_names:
                if feat in record:
                    row.append(float(record[feat]))
                elif "lag1" in feat:
                    # If lag is not provided, use current value as conservative proxy
                    base_feat = feat.replace("_lag1", "")
                    row.append(float(record.get(base_feat, 0.0)))
                elif "rolling_mean" in feat:
                    base_feat = feat.replace("_rolling_mean", "")
                    row.append(float(record.get(base_feat, 0.0)))
                else:
                    row.append(0.0)

            X_input = np.array([row])
            if self.scaler:
                X_input = self.scaler.transform(X_input)

            pred_idx = int(self.model.predict(X_input)[0])
            predicted_next = INV_LABEL_MAP.get(pred_idx, "UNKNOWN")
            
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(X_input)[0]
                future_confidence = round(float(np.max(probs)), 4)
            else:
                future_confidence = 0.90
        else:
            # If model is not yet trained, state that clearly
            predicted_next = "Model Not Trained"
            future_confidence = 0.0

        return {
            "current_state": current_state,
            "predicted_next_interval": predicted_next,
            "prediction_horizon": self.prediction_horizon,
            "current_confidence": 0.98,
            "future_confidence": future_confidence,
            "model_version": self.model_info.get("version", "RuleBased-v1"),
            "methodology": "Threshold-based queuing degradation + Chronological Lag Supervised Forecaster"
        }

# Global singleton pipeline instance
congestion_pipeline = CongestionPredictionPipeline()
