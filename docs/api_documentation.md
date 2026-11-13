# IntelliNet REST API Documentation

The backend exposes fully interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new analyst account.
- **Request Body**: `{ "username": str, "email": str, "password": str, "confirm_password": str, "full_name": str }`
- **Response**: User object without password hash.

### `POST /api/auth/login`
Authenticates user and returns a signed JWT token.
- **Request Body**: `{ "username_or_email": str, "password": str }`
- **Response**: `{ "access_token": str, "token_type": "bearer", "user": User }`

### `GET /api/auth/me`
Retrieves current authenticated operator metadata. Requires Bearer Token.

---

## 2. Dashboard Endpoints

### `GET /api/dashboard/summary`
Returns aggregate KPI metrics, total analyzed flows, count of benign vs malicious flows, live OS telemetry, active model statuses, and the 5 most recent security incidents.

### `GET /api/dashboard/traffic-trend?limit=30`
Returns time-series telemetry array containing throughput (Mbps), latency (ms), packet loss (%), and packets/s for graph rendering.

---

## 3. Intrusion Detection Endpoints

### `POST /api/intrusion/train`
Executes ML model training on an uploaded or synthetic dataset.
- **Request Body**: `{ "model_type": "INTRUSION", "algorithm": "RandomForest", "dataset_id": int, "test_size": float }`
- **Response**: Evaluation dictionary with `accuracy`, `precision`, `recall`, `f1_score`, `confusion_matrix`, and `feature_importance`.

### `POST /api/intrusion/predict`
Runs inference on a flow record. If confidence &gt; 0.60 and class is malicious, automatically creates a record in `SecurityAlert`.
- **Request Body**: Feature dictionary (`destination_port`, `flow_duration`, `total_fwd_packets`, `syn_flag_count`, etc.)
- **Response**: `{ "classification": str, "is_attack": bool, "confidence": float, "top_contributing_features": dict }`

### `GET /api/intrusion/metrics`
Returns active model evaluation report, confusion matrix, and feature importances.

### `GET /api/intrusion/alerts`
Lists security alerts with optional query parameters: `severity`, `category`, `status_filter`.

### `PATCH /api/intrusion/alerts/{alert_id}`
Updates alert status to `ACKNOWLEDGED` or `RESOLVED`.

---

## 4. Congestion Prediction Endpoints

### `POST /api/congestion/train`
Trains the chronological lag time-series forecaster.
- **Request Body**: `{ "model_type": "CONGESTION", "algorithm": "RandomForest", "test_size": 0.20 }`

### `POST /api/congestion/predict`
Evaluates Mode A (Current Queuing State) and Mode B (Future Horizon Prediction).
- **Request Body**: `{ "bandwidth_utilization_pct": float, "throughput_mbps": float, "latency_ms": float, "packet_loss_pct": float }`
- **Response**: `{ "current_state": "MEDIUM", "predicted_next_interval": "HIGH", "prediction_horizon": "Next Measurement Interval" }`

---

## 5. Network Monitoring Endpoints

### `GET /api/network/interfaces`
Lists system network interfaces with MTU, addresses, and operational status.

### `GET /api/network/statistics`
Calculates differential rate counters ($\text{bytes/s}$, $\text{pkts/s}$, throughput in Mbps, active connections).

### `POST /api/network/capture/start`
Starts explicit Scapy packet capture on specified interface with optional BPF filter.

### `POST /api/network/capture/stop`
Halts Scapy capture and returns duration and protocol count tally.

### `GET /api/network/capture/status`
Returns active capture status and packet counts by protocol (TCP, UDP, ICMP, ARP).
