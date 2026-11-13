import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.ml.intrusion_pipeline import intrusion_pipeline
from app.ml.congestion_pipeline import congestion_pipeline
from app.utils.dataset_generator import generate_cic_intrusion_benchmark, generate_congestion_benchmark

def plot_confusion_matrix(cm, labels, title, save_path):
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(title, fontsize=14, fontweight='bold', pad=12)
    plt.xlabel('Predicted Label', fontsize=11)
    plt.ylabel('Ground Truth', fontsize=11)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[+] Saved evaluation figure: {save_path}")

def plot_feature_importance(feat_dict, title, save_path, top_n=10):
    if not feat_dict:
        return
    plt.figure(figsize=(8, 5))
    items = sorted(feat_dict.items(), key=lambda x: x[1], reverse=True)[:top_n]
    names = [i[0].replace('_', ' ').title() for i in items]
    vals = [i[1] for i in items]

    y_pos = np.arange(len(names))
    plt.barh(y_pos, vals, color='#0ea5e9')
    plt.yticks(y_pos, names)
    plt.gca().invert_yaxis()
    plt.title(title, fontsize=14, fontweight='bold', pad=12)
    plt.xlabel('Importance Score', fontsize=11)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[+] Saved feature importance figure: {save_path}")

def main():
    eval_dir = settings.EVALUATION_DIR
    eval_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================")
    print("      INTELLINET OFFLINE MODEL EVALUATION         ")
    print("==================================================")

    # 1. Intrusion Evaluation
    print("\n[*] Evaluating Intrusion Detection Pipeline...")
    if intrusion_pipeline.model is None:
        print("[!] No active model found. Training fresh benchmark model...")
        df_int = generate_cic_intrusion_benchmark(n_samples=1500)
        res_int = intrusion_pipeline.train(df_int, algorithm="RandomForest", multiclass=True)
    else:
        # Re-evaluate on test sample
        df_int = generate_cic_intrusion_benchmark(n_samples=1500)
        res_int = intrusion_pipeline.train(df_int, algorithm="RandomForest", multiclass=True)

    print(f"    Intrusion Accuracy:  {res_int['accuracy']:.4f}")
    print(f"    Intrusion F1-Score:  {res_int['f1_score']:.4f}")
    
    cm_int = np.array(res_int['confusion_matrix'])
    plot_confusion_matrix(
        cm_int, 
        res_int['confusion_matrix_labels'], 
        "Intrusion Detection - Confusion Matrix", 
        eval_dir / "intrusion_confusion_matrix.png"
    )
    plot_feature_importance(
        res_int['feature_importance'],
        "Top Predictive Intrusion Features",
        eval_dir / "intrusion_feature_importance.png"
    )

    # 2. Congestion Evaluation
    print("\n[*] Evaluating Congestion Prediction Forecaster...")
    df_cong = generate_congestion_benchmark(n_samples=600)
    res_cong = congestion_pipeline.train(df_cong, algorithm="RandomForest")

    print(f"    Congestion Accuracy: {res_cong['accuracy']:.4f}")
    print(f"    Congestion F1-Score: {res_cong['f1_score']:.4f}")
    print(f"    Prediction Horizon:  {res_cong['prediction_horizon']}")

    cm_cong = np.array(res_cong['confusion_matrix'])
    plot_confusion_matrix(
        cm_cong,
        res_cong['confusion_matrix_labels'],
        "Congestion Prediction - Confusion Matrix",
        eval_dir / "congestion_confusion_matrix.png"
    )
    plot_feature_importance(
        res_cong['feature_importance'],
        "Top Congestion Predictive Features",
        eval_dir / "congestion_feature_importance.png"
    )

    print("\n[+] All offline evaluation figures generated successfully in:")
    print(f"    {eval_dir}")

if __name__ == "__main__":
    main()
