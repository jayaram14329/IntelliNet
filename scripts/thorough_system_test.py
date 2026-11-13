import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

class TestClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.token = None

    def request(self, method, path, data=None, auth=True):
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        if auth and self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        if data is not None:
            req.data = json.dumps(data).encode("utf-8")
        try:
            with urllib.request.urlopen(req) as res:
                content_type = res.headers.get("Content-Type", "")
                if "application/json" in content_type:
                    return res.status, json.loads(res.read().decode("utf-8"))
                return res.status, res.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                return e.code, json.loads(err_body)
            except Exception:
                return e.code, err_body

def run_thorough_system_test():
    print("=" * 70)
    print("   INTELLINET: COMPREHENSIVE END-TO-END MULTI-PASS VERIFICATION")
    print("=" * 70)

    client = TestClient()
    passed = 0
    failed = 0

    def check(test_name, condition, details=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {test_name} {details}")
        else:
            failed += 1
            print(f"  [FAIL] {test_name} {details}")

    # ==========================================
    # PHASE 1: SYSTEM HEALTH & SERVER READINESS
    # ==========================================
    print("\n--- [Phase 1: System Health & Server Readiness] ---")
    status_code, health = client.request("GET", "/health", auth=False)
    check("Server Health Check", status_code == 200 and health.get("status") == "healthy", f"(HTTP {status_code})")
    check("Intrusion Model Loaded in Memory", health.get("intrusion_model_loaded") is True)
    check("Congestion Model Loaded in Memory", health.get("congestion_model_loaded") is True)
    check("Service Identification", health.get("service") == "IntelliNet", f"v{health.get('version')}")

    # ==========================================
    # PHASE 2: AUTHENTICATION & ACCESS CONTROL
    # ==========================================
    print("\n--- [Phase 2: Authentication & RBAC] ---")
    # 2.1 Admin login
    status_code, auth_data = client.request("POST", "/auth/login", {
        "username_or_email": "admin",
        "password": "Admin@123456"
    }, auth=False)
    check("Admin Authentication", status_code == 200 and "access_token" in auth_data, f"(User: {auth_data.get('user', {}).get('username')})")
    admin_token = auth_data.get("access_token")
    client.token = admin_token

    # 2.2 Verify current user profile
    status_code, user_me = client.request("GET", "/auth/me")
    check("Token Identity Verification (/auth/me)", status_code == 200 and user_me.get("role") == "ADMIN")

    # 2.3 Analyst login
    status_code, analyst_auth = client.request("POST", "/auth/login", {
        "username_or_email": "analyst",
        "password": "Analyst@123456"
    }, auth=False)
    check("Analyst Authentication", status_code == 200 and analyst_auth.get("user", {}).get("role") == "ANALYST")

    # 2.4 Invalid login rejection
    status_code, bad_login = client.request("POST", "/auth/login", {
        "username_or_email": "admin",
        "password": "WrongPassword999!"
    }, auth=False)
    check("Invalid Credentials Rejection", status_code == 401)

    # Switch back to admin for full operations
    client.token = admin_token

    # ==========================================
    # PHASE 3: NOC DASHBOARD & AGGREGATIONS
    # ==========================================
    print("\n--- [Phase 3: NOC Overview & Telemetry Aggregations] ---")
    for loop in range(2):
        status_code, dash = client.request("GET", "/dashboard/summary")
        check(f"Dashboard Summary (Iteration {loop+1})", status_code == 200 and "live_metrics" in dash and "current_congestion" in dash)

    # ==========================================
    # PHASE 4: INPUT METHOD 1 - INTRUSION DETECTION
    # ==========================================
    print("\n--- [Phase 4: Input Method 1 - Intrusion Detection & Flow Inference] ---")
    intrusion_presets = [
        ("Benign Standard Flow", {
            "destination_port": 443, "flow_duration": 4.0, "total_fwd_packets": 2.0,
            "total_backward_packets": 0.0, "total_length_of_fwd_packets": 37.0, "total_length_of_bwd_packets": 0.0,
            "fwd_packet_length_max": 37.0, "fwd_packet_length_min": 0.0, "fwd_packet_length_mean": 18.5,
            "bwd_packet_length_mean": 0.0, "flow_bytes_s": 9250000.0, "flow_packets_s": 500000.0,
            "flow_iat_mean": 4.0, "flow_iat_std": 0.0, "fin_flag_count": 0, "syn_flag_count": 1,
            "rst_flag_count": 0, "psh_flag_count": 0, "ack_flag_count": 1,
            "source_ip": "192.168.1.55", "destination_ip": "142.250.190.46", "protocol": "TCP"
        }, False),
        ("Volumetric DDoS Flow", {
            "destination_port": 80, "flow_duration": 1110734.0, "total_fwd_packets": 3.0,
            "total_backward_packets": 6.0, "total_length_of_fwd_packets": 26.0, "total_length_of_bwd_packets": 11607.0,
            "fwd_packet_length_max": 20.0, "fwd_packet_length_min": 0.0, "fwd_packet_length_mean": 8.666667,
            "bwd_packet_length_mean": 1934.5, "flow_bytes_s": 10473.25462, "flow_packets_s": 8.10275,
            "flow_iat_mean": 138841.75, "flow_iat_std": 392396.72, "fin_flag_count": 0, "syn_flag_count": 0,
            "rst_flag_count": 0, "psh_flag_count": 1, "ack_flag_count": 0,
            "source_ip": "198.51.100.99", "destination_ip": "10.0.0.1", "protocol": "TCP"
        }, True),
        ("Stealth PortScan Flow", {
            "destination_port": 8088, "flow_duration": 57.0, "total_fwd_packets": 1.0,
            "total_backward_packets": 1.0, "total_length_of_fwd_packets": 0.0, "total_length_of_bwd_packets": 6.0,
            "fwd_packet_length_max": 0.0, "fwd_packet_length_min": 0.0, "fwd_packet_length_mean": 0.0,
            "bwd_packet_length_mean": 6.0, "flow_bytes_s": 105263.1579, "flow_packets_s": 35087.7193,
            "flow_iat_mean": 57.0, "flow_iat_std": 0.0, "fin_flag_count": 0, "syn_flag_count": 0,
            "rst_flag_count": 0, "psh_flag_count": 1, "ack_flag_count": 0,
            "source_ip": "203.0.113.12", "destination_ip": "10.0.0.15", "protocol": "TCP"
        }, True),
        ("Invasive Botnet Flow", {
            "destination_port": 22, "flow_duration": 16.0, "total_fwd_packets": 1.0,
            "total_backward_packets": 1.0, "total_length_of_fwd_packets": 6.0, "total_length_of_bwd_packets": 6.0,
            "fwd_packet_length_max": 6.0, "fwd_packet_length_min": 6.0, "fwd_packet_length_mean": 6.0,
            "bwd_packet_length_mean": 6.0, "flow_bytes_s": 750000.0, "flow_packets_s": 125000.0,
            "flow_iat_mean": 16.0, "flow_iat_std": 0.0, "fin_flag_count": 0, "syn_flag_count": 0,
            "rst_flag_count": 0, "psh_flag_count": 0, "ack_flag_count": 1,
            "source_ip": "192.0.2.77", "destination_ip": "10.0.0.22", "protocol": "TCP"
        }, True)
    ]

    for name, flow_data, is_threat in intrusion_presets:
        for attempt in range(2):
            code, res = client.request("POST", "/intrusion/predict", flow_data)
            check(f"Intrusion Inference: {name} (Run {attempt+1})", code == 200 and res.get("is_attack") == is_threat,
                  f"-> Predicted: {res.get('classification')} (Conf: {res.get('confidence', 0)*100:.1f}%)")

    # Verify model metrics & explainability endpoint
    code, int_metrics = client.request("GET", "/intrusion/metrics")
    check("Intrusion Model Metrics & Feature Importance", code == 200 and "feature_importance" in int_metrics)

    # ==========================================
    # PHASE 5: INPUT METHOD 2 - CONGESTION PREDICTION
    # ==========================================
    print("\n--- [Phase 5: Input Method 2 - Congestion Telemetry & Horizon Forecaster] ---")
    congestion_scenarios = [
        ("Nominal Queuing Load", {
            "bandwidth_utilization_pct": 20.0, "throughput_mbps": 200.0,
            "packet_rate_pps": 1500.0, "latency_ms": 15.0, "packet_loss_pct": 0.05, "jitter_ms": 1.2
        }, "LOW"),
        ("Moderate Queue Buildup", {
            "bandwidth_utilization_pct": 58.0, "throughput_mbps": 580.0,
            "packet_rate_pps": 4800.0, "latency_ms": 48.0, "packet_loss_pct": 0.8, "jitter_ms": 5.4
        }, "MEDIUM"),
        ("Buffer Bloat / Burst Congestion", {
            "bandwidth_utilization_pct": 82.0, "throughput_mbps": 820.0,
            "packet_rate_pps": 7500.0, "latency_ms": 95.0, "packet_loss_pct": 2.8, "jitter_ms": 12.0
        }, "HIGH"),
        ("Severe Buffer Drop / Critical", {
            "bandwidth_utilization_pct": 96.0, "throughput_mbps": 960.0,
            "packet_rate_pps": 9200.0, "latency_ms": 185.0, "packet_loss_pct": 8.5, "jitter_ms": 25.0
        }, "CRITICAL")
    ]

    for name, perf_data, expected_mode_a in congestion_scenarios:
        for attempt in range(2):
            code, res = client.request("POST", "/congestion/predict", perf_data)
            check(f"Congestion Inference: {name} (Run {attempt+1})",
                  code == 200 and res.get("current_state") == expected_mode_a,
                  f"-> Mode A: {res.get('current_state')} | Mode B (t+1 Forecast): {res.get('predicted_next_interval')}")

    # Verify Congestion Metrics
    code, cong_metrics = client.request("GET", "/congestion/metrics")
    check("Congestion Model Metrics", code == 200 and "accuracy" in cong_metrics)

    # ==========================================
    # PHASE 6: INPUT METHOD 3 - DATASET MANAGEMENT
    # ==========================================
    print("\n--- [Phase 6: Input Method 3 - Dataset Management & Benchmark Generation] ---")
    code, datasets = client.request("GET", "/datasets")
    check("Dataset Inventory Listing", code == 200 and len(datasets) > 0, f"({len(datasets)} datasets registered)")

    # Test Benchmark Generators
    code, synth_ids = client.request("POST", "/datasets/generate-benchmark?dataset_type=INTRUSION&samples=300")
    check("Generate CIC-IDS2017 Benchmark Dataset", code == 200 and synth_ids.get("status") == "success" and "dataset_id" in synth_ids,
          f"(Dataset ID: {synth_ids.get('dataset_id')})")

    code, synth_cong = client.request("POST", "/datasets/generate-benchmark?dataset_type=CONGESTION&samples=200")
    check("Generate Congestion Telemetry Benchmark Dataset", code == 200 and synth_cong.get("status") == "success" and "dataset_id" in synth_cong,
          f"(Dataset ID: {synth_cong.get('dataset_id')})")

    # Fetch dataset details
    if datasets:
        first_id = datasets[0]["id"]
        code, d_detail = client.request("GET", f"/datasets/{first_id}")
        check("Dataset Inspection & CSV Preview", code == 200 and "preview" in d_detail and len(d_detail["preview"]) > 0)

    # ==========================================
    # PHASE 7: MODEL LIFECYCLE & RETRAINING SUITE
    # ==========================================
    print("\n--- [Phase 7: Model Lifecycle & Retraining Suite] ---")
    # Retrain Intrusion with DecisionTree on synthetic benchmark
    code, retrain_int = client.request("POST", "/intrusion/train", {
        "model_type": "INTRUSION",
        "algorithm": "DecisionTree",
        "use_synthetic": True,
        "test_size": 0.2
    })
    int_acc = retrain_int.get("metrics", {}).get("accuracy", 0)
    int_f1 = retrain_int.get("metrics", {}).get("f1_score", 0)
    check("Train Intrusion Classifier (DecisionTree)", code == 200 and int_acc > 0.85,
          f"-> Accuracy: {int_acc*100:.1f}%, F1: {int_f1*100:.1f}%")

    # Retrain Congestion with DecisionTree
    code, retrain_cong = client.request("POST", "/congestion/train", {
        "model_type": "CONGESTION",
        "algorithm": "DecisionTree",
        "use_synthetic": True,
        "test_size": 0.2
    })
    cong_acc = retrain_cong.get("metrics", {}).get("accuracy", 0)
    cong_f1 = retrain_cong.get("metrics", {}).get("f1_score", 0)
    check("Train Congestion Forecaster (DecisionTree)", code == 200 and cong_acc > 0.70,
          f"-> Accuracy: {cong_acc*100:.1f}%, F1: {cong_f1*100:.1f}%")

    # Re-train back with Random Forest on real Kaggle dataset for production accuracy
    kaggle_ds = next((d for d in datasets if "kaggle" in d["name"].lower() or "real" in d["name"].lower()), None)
    if kaggle_ds:
        code, retrain_rf = client.request("POST", "/intrusion/train", {
            "model_type": "INTRUSION",
            "algorithm": "RandomForest",
            "dataset_id": kaggle_ds["id"],
            "test_size": 0.2
        })
        rf_acc = retrain_rf.get("metrics", {}).get("accuracy", 0)
        check("Re-deploy High-Precision Random Forest on Real Kaggle Flows", code == 200 and rf_acc > 0.95,
              f"-> Final Production Accuracy: {rf_acc*100:.2f}%")

    # ==========================================
    # PHASE 8: ALERTS CENTER (RBAC & LIFECYCLE)
    # ==========================================
    print("\n--- [Phase 8: Security Alerts Center & Incident Lifecycle] ---")
    code, alerts = client.request("GET", "/intrusion/alerts?limit=15")
    check("Query Security Alerts", code == 200 and len(alerts) > 0, f"(Retrieved {len(alerts)} alerts)")

    if alerts:
        target_alert = alerts[0]
        alert_id = target_alert["id"]

        # Acknowledge
        code, ack_res = client.request("PATCH", f"/intrusion/alerts/{alert_id}", {"status": "ACKNOWLEDGED"})
        check("Alert Status Transition -> ACKNOWLEDGED", code == 200 and ack_res.get("status") == "ACKNOWLEDGED")

        # Resolve
        code, res_res = client.request("PATCH", f"/intrusion/alerts/{alert_id}", {"status": "RESOLVED"})
        check("Alert Status Transition -> RESOLVED", code == 200 and res_res.get("status") == "RESOLVED")

    # ==========================================
    # PHASE 9: INPUT METHOD 4 - NETWORK MONITOR & SNIFFER
    # ==========================================
    print("\n--- [Phase 9: Input Method 4 - Network Telemetry & Defensive Sniffer] ---")
    code, ifaces = client.request("GET", "/network/interfaces")
    check("Network Interface (NIC) Discovery", code == 200 and len(ifaces.get("interfaces", [])) > 0,
          f"({len(ifaces.get('interfaces', []))} interfaces discovered)")

    # Read live differential telemetry over consecutive windows
    for win in range(3):
        time.sleep(0.4)
        code, stats = client.request("GET", "/network/statistics")
        check(f"Live Differential Telemetry Window {win+1}", code == 200 and stats.get("throughput_mbps", -1) >= 0,
              f"Throughput: {stats.get('throughput_mbps', 0):.2f} Mbps, Util: {stats.get('bandwidth_utilization_pct', 0):.1f}%")

    # Defensive Sniffer lifecycle
    code, start_sniff = client.request("POST", "/network/capture/start", {})
    check("Defensive Packet Sniffer: Start Trigger", code == 200 and start_sniff.get("status") in ["success", "error"])

    code, status_sniff = client.request("GET", "/network/capture/status")
    check("Defensive Packet Sniffer: Poll Status", code == 200 and "is_sniffing" in status_sniff)

    time.sleep(0.5)
    code, stop_sniff = client.request("POST", "/network/capture/stop", {})
    check("Defensive Packet Sniffer: Stop Trigger", code == 200 and stop_sniff.get("status") in ["success", "warning"])

    # ==========================================
    # PHASE 10: REPORTS, AUDITING & SETTINGS
    # ==========================================
    print("\n--- [Phase 10: Operational Reports, Audits & Settings] ---")
    code, rep_sum = client.request("GET", "/reports/summary")
    check("Consolidated System Report", code == 200 and "total_models_trained" in rep_sum and "security_alerts" in rep_sum)

    code, csv_content = client.request("GET", "/reports/export-alerts")
    check("CSV Security Incident Export", code == 200 and "Timestamp" in str(csv_content))

    code, sys_settings = client.request("GET", "/settings")
    check("Read Operational Thresholds", code == 200 and "thresholds" in sys_settings)

    code, update_set = client.request("POST", "/settings", {
        "latency_threshold_medium": 40.0,
        "latency_threshold_high": 80.0,
        "latency_threshold_critical": 150.0,
        "packet_loss_threshold_medium": 0.5,
        "packet_loss_threshold_high": 2.0,
        "packet_loss_threshold_critical": 5.0,
        "bandwidth_threshold_medium": 50.0,
        "bandwidth_threshold_high": 75.0,
        "bandwidth_threshold_critical": 90.0
    })
    check("Update Operational Thresholds", code == 200 and update_set.get("status") == "success")

    # ==========================================
    # FINAL RESULTS TALLY
    # ==========================================
    total_tests = passed + failed
    pass_pct = (passed / total_tests) * 100 if total_tests > 0 else 0
    print("\n" + "=" * 70)
    print(f"   COMPREHENSIVE TEST RESULTS: {passed} / {total_tests} PASSED ({pass_pct:.1f}%)")
    print("=" * 70)

    if failed == 0:
        print("\n>>> ALL 10 PHASES & ALL 4 INPUT METHODS PASSED VERIFICATION WITH ZERO ERRORS! <<<")
    else:
        print(f"\n>>> WARNING: {failed} test(s) failed. Check details above. <<<")

    return failed == 0

if __name__ == "__main__":
    success = run_thorough_system_test()
    exit(0 if success else 1)
