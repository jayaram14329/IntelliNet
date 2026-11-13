import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from pathlib import Path
from app.core.config import settings

def generate_cic_intrusion_benchmark(n_samples: int = 1500) -> pd.DataFrame:
    """
    Generates a realistic benchmark dataset adhering to the CIC-IDS2017 flow schema.
    Clearly marked as synthetic benchmark data for academic validation and testing.
    Classes: BENIGN (60%), DDoS (20%), PortScan (10%), Botnet (10%).
    """
    np.random.seed(42)
    records = []

    classes = [
        ("BENIGN", int(n_samples * 0.60)),
        ("DDoS", int(n_samples * 0.20)),
        ("PortScan", int(n_samples * 0.10)),
        ("Botnet", int(n_samples * 0.10))
    ]

    for label, count in classes:
        for _ in range(count):
            if label == "BENIGN":
                dest_port = np.random.choice([80, 443, 53, 8080, 22])
                duration = np.random.exponential(scale=200000) + 1000
                fwd_pkts = np.random.randint(5, 50)
                bwd_pkts = np.random.randint(4, 60)
                fwd_len = fwd_pkts * np.random.uniform(100, 800)
                bwd_len = bwd_pkts * np.random.uniform(200, 1400)
                flow_bytes_s = (fwd_len + bwd_len) / (duration / 1e6 + 0.001)
                flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1e6 + 0.001)
                syn = 1 if np.random.rand() > 0.3 else 0
                fin = 1 if np.random.rand() > 0.4 else 0
                rst = 0
                ack = 1
            elif label == "DDoS":
                # High packet rate, short duration, flooded SYN flags
                dest_port = np.random.choice([80, 443, 8080])
                duration = np.random.uniform(500, 50000)
                fwd_pkts = np.random.randint(500, 5000)
                bwd_pkts = np.random.randint(0, 5) # Few responses
                fwd_len = fwd_pkts * np.random.uniform(40, 100) # Small payloads
                bwd_len = bwd_pkts * 40
                flow_bytes_s = (fwd_len + bwd_len) / (duration / 1e6 + 0.001)
                flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1e6 + 0.001)
                syn = 1
                fin = 0
                rst = 1 if np.random.rand() > 0.5 else 0
                ack = 0
            elif label == "PortScan":
                # Sequential high ports, minimal packets, SYN without ACK
                dest_port = np.random.randint(1024, 65535)
                duration = np.random.uniform(50, 2000)
                fwd_pkts = np.random.randint(1, 3)
                bwd_pkts = np.random.randint(0, 2)
                fwd_len = fwd_pkts * 44
                bwd_len = bwd_pkts * 40
                flow_bytes_s = (fwd_len + bwd_len) / (duration / 1e6 + 0.001)
                flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1e6 + 0.001)
                syn = 1
                fin = 0
                rst = 1
                ack = 0
            else: # Botnet / Brute Force
                dest_port = np.random.choice([22, 21, 3389, 445])
                duration = np.random.uniform(50000, 600000)
                fwd_pkts = np.random.randint(20, 150)
                bwd_pkts = np.random.randint(20, 150)
                fwd_len = fwd_pkts * np.random.uniform(50, 200)
                bwd_len = bwd_pkts * np.random.uniform(50, 200)
                flow_bytes_s = (fwd_len + bwd_len) / (duration / 1e6 + 0.001)
                flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1e6 + 0.001)
                syn = 1
                fin = 1
                rst = 0
                ack = 1

            records.append({
                "destination_port": dest_port,
                "flow_duration": round(duration, 2),
                "total_fwd_packets": fwd_pkts,
                "total_backward_packets": bwd_pkts,
                "total_length_of_fwd_packets": round(fwd_len, 2),
                "total_length_of_bwd_packets": round(bwd_len, 2),
                "fwd_packet_length_max": round(fwd_len / max(fwd_pkts, 1) * 1.5, 2),
                "fwd_packet_length_min": 0.0,
                "fwd_packet_length_mean": round(fwd_len / max(fwd_pkts, 1), 2),
                "bwd_packet_length_mean": round(bwd_len / max(bwd_pkts, 1), 2),
                "flow_bytes_s": round(flow_bytes_s, 2),
                "flow_packets_s": round(flow_pkts_s, 2),
                "flow_iat_mean": round(duration / max(fwd_pkts + bwd_pkts, 1), 2),
                "flow_iat_std": round((duration / max(fwd_pkts + bwd_pkts, 1)) * 0.3, 2),
                "fin_flag_count": fin,
                "syn_flag_count": syn,
                "rst_flag_count": rst,
                "psh_flag_count": 1 if np.random.rand() > 0.5 else 0,
                "ack_flag_count": ack,
                "label": label,
                "source": "SYNTHETIC_BENCHMARK"
            })

    df = pd.DataFrame(records)
    # Shuffle
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df

def generate_congestion_benchmark(n_samples: int = 600, interval_seconds: int = 10) -> pd.DataFrame:
    """
    Generates a realistic temporal network performance telemetry benchmark.
    Simulates changing queue conditions, diurnal patterns, burst periods, and packet drops.
    Clearly labeled with is_synthetic=True and source='SYNTHETIC_BENCHMARK'.
    """
    np.random.seed(42)
    start_time = datetime.now(timezone.utc) - timedelta(seconds=n_samples * interval_seconds)
    records = []

    # State machine simulation: normal -> rising -> congested -> critical -> recovery
    bandwidth = 25.0
    latency = 18.0
    loss = 0.05
    connections = 80

    for i in range(n_samples):
        timestamp = start_time + timedelta(seconds=i * interval_seconds)
        
        # Periodic wave + random perturbations
        wave = np.sin(i / 30.0) * 20.0
        
        # Induce congestion spikes at intervals
        if 150 <= i <= 200 or 380 <= i <= 430:
            bandwidth = min(98.0, bandwidth + np.random.uniform(1.0, 3.5))
            latency = min(220.0, latency + np.random.uniform(3.0, 8.0))
            loss = min(8.5, loss + np.random.uniform(0.1, 0.4))
            connections = min(600, connections + np.random.randint(5, 15))
        else:
            # Revert to normal
            target_bw = max(15.0, 35.0 + wave + np.random.normal(0, 3))
            bandwidth = bandwidth * 0.9 + target_bw * 0.1
            target_lat = max(12.0, 22.0 + (bandwidth / 100.0) ** 2 * 35.0 + np.random.normal(0, 1.5))
            latency = latency * 0.9 + target_lat * 0.1
            target_loss = max(0.01, (bandwidth / 100.0) ** 3 * 2.0 + np.random.normal(0, 0.05))
            loss = loss * 0.85 + target_loss * 0.15
            connections = int(max(40, 100 + bandwidth * 2 + np.random.normal(0, 5)))

        jitter = max(0.5, latency * 0.08 + np.random.exponential(1.0))
        throughput = round((bandwidth / 100.0) * 1000.0 * np.random.uniform(0.92, 1.0), 2)
        packet_rate = round(throughput * 85.0 + np.random.normal(0, 20), 1)

        # Derive label
        if loss >= 5.0 or latency >= 150.0 or bandwidth >= 90.0:
            level = "CRITICAL"
        elif loss >= 2.0 or latency >= 80.0 or bandwidth >= 75.0:
            level = "HIGH"
        elif latency >= 40.0 or bandwidth >= 50.0 or loss >= 0.5:
            level = "MEDIUM"
        else:
            level = "LOW"

        records.append({
            "timestamp": timestamp.isoformat(),
            "bandwidth_utilization_pct": round(float(bandwidth), 2),
            "throughput_mbps": round(float(throughput), 2),
            "packet_rate_pps": round(float(packet_rate), 2),
            "latency_ms": round(float(latency), 2),
            "packet_loss_pct": round(float(loss), 3),
            "jitter_ms": round(float(jitter), 2),
            "active_connections": int(connections),
            "congestion_level": level,
            "source": "SYNTHETIC_BENCHMARK",
            "is_synthetic": True
        })

    return pd.DataFrame(records)
