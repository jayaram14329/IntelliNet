import pytest
import numpy as np
import pandas as pd
from app.ml.intrusion_pipeline import IntrusionDetectionPipeline
from app.ml.congestion_pipeline import CongestionPredictionPipeline, derive_congestion_label
from app.utils.dataset_generator import generate_cic_intrusion_benchmark, generate_congestion_benchmark

def test_intrusion_pipeline_training_and_predict():
    pipeline = IntrusionDetectionPipeline()
    df = generate_cic_intrusion_benchmark(n_samples=200)
    
    # Train
    metrics = pipeline.train(df, algorithm="DecisionTree", test_size=0.25, multiclass=True)
    assert metrics["accuracy"] > 0.70
    assert "confusion_matrix" in metrics
    assert len(metrics["feature_importance"]) > 0

    # Test single flow inference
    sample_flow = {
        "destination_port": 80,
        "flow_duration": 50000,
        "total_fwd_packets": 12,
        "total_backward_packets": 10,
        "total_length_of_fwd_packets": 800,
        "total_length_of_bwd_packets": 1200,
        "flow_bytes_s": 40000,
        "flow_packets_s": 440,
        "syn_flag_count": 1,
        "fin_flag_count": 1,
        "ack_flag_count": 1
    }
    pred = pipeline.predict_record(sample_flow)
    assert "classification" in pred
    assert "is_attack" in pred
    assert 0.0 <= pred["confidence"] <= 1.0

def test_congestion_label_methodology():
    # Nominal
    assert derive_congestion_label(20.0, 15.0, 0.0) == "LOW"
    # Medium latency
    assert derive_congestion_label(45.0, 50.0, 0.1) == "MEDIUM"
    # High bandwidth / latency
    assert derive_congestion_label(80.0, 90.0, 2.5) == "HIGH"
    # Critical packet loss
    assert derive_congestion_label(50.0, 30.0, 6.0) == "CRITICAL"

def test_congestion_pipeline_training_and_predict():
    pipeline = CongestionPredictionPipeline()
    df = generate_congestion_benchmark(n_samples=150)

    # Train
    metrics = pipeline.train(df, algorithm="DecisionTree", test_size=0.20)
    assert metrics["accuracy"] > 0.60
    assert "Next" in metrics["prediction_horizon"]

    # Inference
    sample_perf = {
        "bandwidth_utilization_pct": 85.0,
        "throughput_mbps": 850.0,
        "packet_rate_pps": 7200.0,
        "latency_ms": 110.0,
        "packet_loss_pct": 3.2,
        "jitter_ms": 12.0,
        "active_connections": 350
    }
    pred = pipeline.predict_record(sample_perf)
    assert pred["current_state"] in ["HIGH", "CRITICAL"]
    assert "predicted_next_interval" in pred
