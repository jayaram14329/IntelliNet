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
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

from app.core.config import settings
from app.ml.feature_engineering import clean_cic_dataset, extract_flow_features, STANDARD_INTRUSION_FEATURES

class IntrusionDetectionPipeline:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names: List[str] = []
        self.label_mapping: Dict[int, str] = {}
        self.inverse_label_mapping: Dict[str, int] = {}
        self.model_info: Dict[str, Any] = {}
        self.is_multiclass: bool = False
        self._load_active_model()

    def _load_active_model(self):
        """Attempts to load the most recently saved active model from disk."""
        models_dir = settings.MODELS_DIR
        active_file = models_dir / "active_intrusion_model.joblib"
        if active_file.exists():
            try:
                bundle = joblib.load(active_file)
                self.model = bundle["model"]
                self.scaler = bundle.get("scaler")
                self.feature_names = bundle["feature_names"]
                self.label_mapping = bundle["label_mapping"]
                self.inverse_label_mapping = bundle["inverse_label_mapping"]
                self.model_info = bundle.get("model_info", {})
                self.is_multiclass = bundle.get("is_multiclass", False)
            except Exception as e:
                print(f"[Warning] Failed to load intrusion model: {e}")

    def train(
        self,
        df: pd.DataFrame,
        algorithm: str = "RandomForest",
        test_size: float = 0.2,
        random_state: int = 42,
        multiclass: bool = False
    ) -> Dict[str, Any]:
        """
        Train an intrusion detection model using the provided DataFrame.
        Evaluates metrics, saves the model artifact, and returns evaluation summary.
        """
        X, y_raw, feature_names = extract_flow_features(df)
        
        # Determine labels
        unique_labels = sorted(list(y_raw.unique()))
        
        if not multiclass:
            # Binary classification: BENIGN vs ATTACK
            y = y_raw.apply(lambda val: 0 if "benign" in str(val).lower() else 1).values
            label_mapping = {0: "BENIGN", 1: "ATTACK"}
            inverse_label_mapping = {"BENIGN": 0, "ATTACK": 1}
            is_multi = False
        else:
            label_mapping = {idx: label for idx, label in enumerate(unique_labels)}
            inverse_label_mapping = {label: idx for idx, label in label_mapping.items()}
            y = y_raw.map(inverse_label_mapping).values
            is_multi = len(unique_labels) > 2

        # Train/Test Split (stratified)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y if len(np.unique(y)) > 1 else None
        )

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Select Algorithm
        alg_lower = algorithm.lower()
        if "tree" in alg_lower:
            model = DecisionTreeClassifier(max_depth=15, random_state=random_state)
            alg_name = "DecisionTree"
        elif "logistic" in alg_lower:
            model = LogisticRegression(max_iter=1000, random_state=random_state)
            alg_name = "LogisticRegression"
        else:
            model = RandomForestClassifier(n_estimators=60, max_depth=15, random_state=random_state, n_jobs=-1)
            alg_name = "RandomForest"

        # Fit
        model.fit(X_train_scaled, y_train)

        # Predict & Evaluate
        y_pred = model.predict(X_test_scaled)
        acc = float(accuracy_score(y_test, y_pred))
        
        # Precision, Recall, F1
        avg_mode = "weighted" if is_multi else "binary"
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average=avg_mode, zero_division=0
        )
        
        # Per-class classification report
        report_dict = classification_report(
            y_test, y_pred, 
            target_names=[label_mapping[i] for i in sorted(list(np.unique(np.concatenate([y_test, y_pred]))))],
            output_dict=True,
            zero_division=0
        )
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        cm_list = cm.tolist()
        cm_labels = [label_mapping[i] for i in sorted(list(np.unique(np.concatenate([y_test, y_pred]))))]

        # Feature Importance
        feature_importance = {}
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance = {
                feat: float(imp) for feat, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
            }
        elif hasattr(model, "coef_"):
            coef = np.abs(model.coef_[0])
            feature_importance = {
                feat: float(imp) for feat, imp in sorted(zip(feature_names, coef), key=lambda x: x[1], reverse=True)
            }

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        version = f"v1.{timestamp_str}"
        model_filename = f"intrusion_{alg_name}_{version}.joblib"
        model_filepath = settings.MODELS_DIR / model_filename

        model_info = {
            "algorithm": alg_name,
            "version": version,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_count": len(feature_names),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_multiclass": is_multi
        }

        # Persist bundle
        bundle = {
            "model": model,
            "scaler": scaler,
            "feature_names": feature_names,
            "label_mapping": label_mapping,
            "inverse_label_mapping": inverse_label_mapping,
            "model_info": model_info,
            "is_multiclass": is_multi
        }
        joblib.dump(bundle, model_filepath)
        # Also copy/save as active model
        active_filepath = settings.MODELS_DIR / "active_intrusion_model.joblib"
        joblib.dump(bundle, active_filepath)

        # Update in-memory state
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        self.label_mapping = label_mapping
        self.inverse_label_mapping = inverse_label_mapping
        self.model_info = model_info
        self.is_multiclass = is_multi

        metrics_summary = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "confusion_matrix": cm_list,
            "confusion_matrix_labels": cm_labels,
            "classification_report": report_dict,
            "feature_importance": feature_importance,
            "model_version": version,
            "algorithm": alg_name,
            "file_path": str(model_filepath)
        }
        return metrics_summary

    def predict_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Perform intrusion inference on a single feature dictionary."""
        if self.model is None:
            raise RuntimeError("Intrusion detection model is not trained yet. Please train or load a model first.")

        # Match features expected by model
        row = []
        for feat in self.feature_names:
            val = record.get(feat, 0.0)
            try:
                row.append(float(val))
            except (ValueError, TypeError):
                row.append(0.0)

        X_input = np.array([row])
        if self.scaler:
            X_input = self.scaler.transform(X_input)

        pred_idx = int(self.model.predict(X_input)[0])
        label = self.label_mapping.get(pred_idx, "UNKNOWN")
        is_attack = (label.upper() != "BENIGN")

        confidence = 1.0
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X_input)[0]
            confidence = float(np.max(probs))

        # Top contributing features based on scaled values and importances
        top_contributions = {}
        if hasattr(self.model, "feature_importances_"):
            for feat, val, imp in zip(self.feature_names, row, self.model.feature_importances_):
                top_contributions[feat] = round(float(imp * abs(val)), 4)
            # Sort descending
            top_contributions = dict(sorted(top_contributions.items(), key=lambda x: x[1], reverse=True)[:5])

        return {
            "classification": label,
            "is_attack": is_attack,
            "confidence": round(confidence, 4),
            "model_version": self.model_info.get("version", "v1.0"),
            "algorithm": self.model_info.get("algorithm", "Unknown"),
            "top_contributions": top_contributions
        }

# Global singleton pipeline instance
intrusion_pipeline = IntrusionDetectionPipeline()
