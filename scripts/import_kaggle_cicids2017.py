import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.models.ml_models import ModelVersion, TrainingRun
from app.ml.intrusion_pipeline import intrusion_pipeline
from app.ml.feature_engineering import clean_column_name

def main():
    kaggle_dir = Path(r"C:\Users\jayaram\.cache\kagglehub\datasets\dhoogla\cicids2017\versions\3")
    if not kaggle_dir.exists():
        print(f"[!] Error: Kaggle dataset directory not found at {kaggle_dir}")
        return

    print("==================================================")
    print("   INTELLINET: KAGGLE CIC-IDS2017 IMPORTER & TRAINER ")
    print("==================================================")

    records = []

    # 1. Portscan (All ~1,956 attack flows + 2,000 Benign)
    portscan_path = kaggle_dir / "Portscan-Friday-no-metadata.parquet"
    if portscan_path.exists():
        print("[*] Reading Portscan-Friday-no-metadata.parquet...")
        df_ps = pd.read_parquet(portscan_path)
        attacks = df_ps[df_ps["Label"] == "PortScan"]
        benigns = df_ps[df_ps["Label"] == "Benign"].sample(n=min(2000, len(df_ps)), random_state=42)
        records.append(attacks)
        records.append(benigns)
        print(f"    Loaded {len(attacks)} PortScan attacks and {len(benigns)} Benign flows.")

    # 2. DDoS (2,500 attack flows)
    ddos_path = kaggle_dir / "DDoS-Friday-no-metadata.parquet"
    if ddos_path.exists():
        print("[*] Reading DDoS-Friday-no-metadata.parquet...")
        df_ddos = pd.read_parquet(ddos_path)
        attacks_ddos = df_ddos[df_ddos["Label"] == "DDoS"].sample(n=2500, random_state=42)
        records.append(attacks_ddos)
        print(f"    Loaded {len(attacks_ddos)} DDoS attacks.")

    # 3. Botnet (All 1,437 Bot flows)
    bot_path = kaggle_dir / "Botnet-Friday-no-metadata.parquet"
    if bot_path.exists():
        print("[*] Reading Botnet-Friday-no-metadata.parquet...")
        df_bot = pd.read_parquet(bot_path)
        attacks_bot = df_bot[df_bot["Label"] == "Bot"]
        records.append(attacks_bot)
        print(f"    Loaded {len(attacks_bot)} Botnet attacks.")

    # Concatenate and clean
    combined_df = pd.concat(records, ignore_index=True)
    combined_df = combined_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    # Sanitize label strings (normalize 'Bot' -> 'Botnet')
    combined_df["Label"] = combined_df["Label"].replace({"Bot": "Botnet"})

    # Export to C:\CN\datasets\intrusion\cic_ids2017_kaggle_real_flows.csv
    dest_path = settings.DATASETS_DIR / "intrusion" / "cic_ids2017_kaggle_real_flows.csv"
    combined_df.to_csv(dest_path, index=False)
    print(f"\n[+] Created dataset CSV at: {dest_path}")
    print(f"    Total Rows:    {len(combined_df):,}")
    print(f"    Total Columns: {len(combined_df.columns)}")
    print("    Class Distribution:")
    for label, count in combined_df["Label"].value_counts().items():
        print(f"      - {label:<10}: {count:,}")

    # Register in Database
    db = SessionLocal()
    try:
        # Check if already registered
        existing = db.query(Dataset).filter(Dataset.filename == "cic_ids2017_kaggle_real_flows.csv").first()
        label_summary = {str(k): int(v) for k, v in combined_df["Label"].value_counts().items()}
        feature_summary = {
            "columns": [clean_column_name(c) for c in combined_df.columns],
            "missing_values_count": int(combined_df.isna().sum().sum()),
            "numeric_columns_count": len(combined_df.select_dtypes(include=["number"]).columns)
        }

        if existing:
            dataset_record = existing
            dataset_record.row_count = len(combined_df)
            dataset_record.column_count = len(combined_df.columns)
            dataset_record.label_summary_json = json.dumps(label_summary)
            dataset_record.feature_summary_json = json.dumps(feature_summary)
            db.commit()
            print(f"[+] Updated dataset record #{dataset_record.id} in database.")
        else:
            dataset_record = Dataset(
                name="CIC-IDS2017 Real Flows (Kaggle Multi-Attack Sample)",
                filename="cic_ids2017_kaggle_real_flows.csv",
                file_path=str(dest_path),
                dataset_type="INTRUSION",
                source="KAGGLE_CIC_IDS2017",
                is_synthetic=False,
                row_count=len(combined_df),
                column_count=len(combined_df.columns),
                feature_summary_json=json.dumps(feature_summary),
                label_summary_json=json.dumps(label_summary),
                status="READY",
                uploaded_by="admin"
            )
            db.add(dataset_record)
            db.commit()
            db.refresh(dataset_record)
            print(f"[+] Registered new dataset record #{dataset_record.id} in database.")

        # Train Random Forest Model on this real dataset!
        print("\n[*] Training Random Forest model on real CIC-IDS2017 Kaggle data...")
        results = intrusion_pipeline.train(
            df=combined_df,
            algorithm="RandomForest",
            test_size=0.20,
            random_state=42,
            multiclass=True
        )

        model_ver = ModelVersion(
            name="Intrusion-RandomForest-KaggleReal",
            model_type="INTRUSION",
            algorithm="RandomForest",
            version=results["model_version"],
            file_path=results["file_path"],
            dataset_id=dataset_record.id,
            accuracy=results["accuracy"],
            precision=results["precision"],
            recall=results["recall"],
            f1_score=results["f1_score"],
            metrics_json=json.dumps({
                "confusion_matrix": results["confusion_matrix"],
                "confusion_matrix_labels": results["confusion_matrix_labels"],
                "classification_report": results["classification_report"]
            }),
            feature_names_json=json.dumps(intrusion_pipeline.feature_names),
            feature_importance_json=json.dumps(results["feature_importance"]),
            is_active=True,
            trained_by="admin"
        )
        db.add(model_ver)
        db.commit()
        db.refresh(model_ver)

        print("\n==================================================")
        print("     MODEL TRAINING COMPLETE ON REAL KAGGLE DATA  ")
        print("==================================================")
        print(f"  Accuracy:      {results['accuracy'] * 100:.2f}%")
        print(f"  Precision:     {results['precision'] * 100:.2f}%")
        print(f"  Recall:        {results['recall'] * 100:.2f}%")
        print(f"  F1-Score:      {results['f1_score'] * 100:.2f}%")
        print(f"  Model Version: {results['model_version']}")
        print(f"  Saved File:    {results['file_path']}")
        print("\nConfusion Matrix:")
        for label, row in zip(results['confusion_matrix_labels'], results['confusion_matrix']):
            print(f"  {label:<10}: {row}")

    finally:
        db.close()

if __name__ == "__main__":
    main()
