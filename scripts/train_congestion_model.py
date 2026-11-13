import sys
import argparse
import pandas as pd
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.ml.congestion_pipeline import congestion_pipeline
from app.utils.dataset_generator import generate_congestion_benchmark

def main():
    parser = argparse.ArgumentParser(description="Train IntelliNet Congestion Prediction Model")
    parser.add_argument("--algorithm", type=str, default="RandomForest", choices=["RandomForest", "DecisionTree", "LogisticRegression"])
    parser.add_argument("--dataset", type=str, default=None, help="Path to network performance CSV dataset")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--samples", type=int, default=600, help="Number of benchmark time-series epochs")
    args = parser.parse_args()

    print(f"[*] Training Congestion Prediction Forecaster [{args.algorithm}]...")
    if args.dataset and Path(args.dataset).exists():
        print(f"[*] Loading dataset from: {args.dataset}")
        df = pd.read_csv(args.dataset)
    else:
        print(f"[*] Generating {args.samples} benchmark telemetry epochs...")
        df = generate_congestion_benchmark(n_samples=args.samples)

    results = congestion_pipeline.train(
        df=df,
        algorithm=args.algorithm,
        test_size=args.test_size,
        prediction_horizon="Next Measurement Interval"
    )

    print("\n[+] Training Complete!")
    print(f"    Algorithm:   {results['algorithm']}")
    print(f"    Version:     {results['model_version']}")
    print(f"    Horizon:     {results['prediction_horizon']}")
    print(f"    Accuracy:    {results['accuracy']:.4f}")
    print(f"    Precision:   {results['precision']:.4f}")
    print(f"    Recall:      {results['recall']:.4f}")
    print(f"    F1-Score:    {results['f1_score']:.4f}")
    print(f"    Saved To:    {results['file_path']}")
    print("\nConfusion Matrix:")
    for label, row in zip(results['confusion_matrix_labels'], results['confusion_matrix']):
        print(f"    {label:<10}: {row}")

if __name__ == "__main__":
    main()
