# IntelliNet System Architecture Document

## 1. Executive Architecture Overview

**IntelliNet** is an intelligent, full-stack Computer Networks engineering system providing dual analytic capabilities:
1. **Intrusion Detection Intelligence**: Flow-based anomaly and signature detection based on the Canadian Institute for Cybersecurity (CIC-IDS2017) feature schema.
2. **Network Congestion Prediction**: Queuing delay, packet drop, and bandwidth exhaustion forecasting using historical telemetry lag features and temporal splits.

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                     |
|                       React 19 + TypeScript + Vite + Tailwind CSS                     |
|           Recharts Dynamic Telemetry | Status Badges | Glassmorphic NOC Console       |
+---------------------------------------------------------------------------------------+
                                           |
                                  REST APIs (JSON / JWT)
                                           v
+---------------------------------------------------------------------------------------+
|                                  FASTAPI BACKEND                                      |
|    +--------------------+  +----------------------+  +-----------------------------+  |
|    | Security & Auth    |  | Telemetry Collector  |  | Packet Sniffer Manager      |  |
|    | Bcrypt + PyJWT     |  | Psutil System Diffs  |  | Scapy Raw Frame Inspection  |  |
|    +--------------------+  +----------------------+  +-----------------------------+  |
|                                           |                                           |
|    +--------------------------------------+--------------------------------------+    |
|    |                        MACHINE LEARNING ENGINE                              |    |
|    |   [Intrusion Detection Pipeline]         [Congestion Prediction Pipeline]   |    |
|    |   - Header sanitization & imputation     - Mode A: Defensible Queuing Rules |    |
|    |   - CIC-IDS2017 Feature Scaler           - Mode B: Chronological Lag Model  |    |
|    |   - Random Forest / Tree Classifier      - Rolling Windows (t-3 to t)       |    |
|    |   - Feature Importance Extractor         - Next Interval Horizon (t+1)      |    |
|    +-----------------------------------------------------------------------------+    |
+---------------------------------------------------------------------------------------+
                       |                                           |
                       v                                           v
+--------------------------------------+   +--------------------------------------------+
|        SQLITE / POSTGRESQL           |   |            ARTIFACT STORE                  |
| Users, Datasets, ModelVersions,      |   | .joblib serializations, confusion matrix   |
| Alerts, Observations, AuditLogs      |   | PNG evaluation plots, benchmark CSV files  |
+--------------------------------------+   +--------------------------------------------+
```

---

## 2. Machine Learning Engine Architecture

### A. Intrusion Detection Pipeline
- **Input Dimensions**: 19 normalized standard flow attributes (`destination_port`, `flow_duration`, `total_fwd_packets`, `total_backward_packets`, `total_length_of_fwd_packets`, `flow_bytes_s`, `flow_packets_s`, `flow_iat_mean`, `syn_flag_count`, `fin_flag_count`, etc.).
- **Preprocessing**: Cleans inconsistent whitespace-padded column names from CIC-IDS2017, replaces `+inf`/`-inf` with `NaN`, applies median imputation, and scales via `StandardScaler`.
- **Model Ensembles**: Supports Random Forest, Decision Tree, and Logistic Regression with reproducible random seeds.
- **Explainability**: Computes Gini-impurity-based feature importances to highlight top contributing traffic features.

### B. Congestion Prediction Pipeline
- **Dual Analytical Modes**:
  - **Mode A (Current Congestion State)**: Evaluates observed network performance against defensible network engineering criteria (RFC buffer degradation boundaries):
    - `CRITICAL`: Loss &gt; 5.0% OR Latency &gt; 150ms OR Bandwidth &gt; 90%
    - `HIGH`: Loss &gt; 2.0% OR Latency &gt; 80ms OR Bandwidth &gt; 75%
    - `MEDIUM`: Latency &gt; 40ms OR Bandwidth &gt; 50% OR Loss &gt; 0.5%
    - `LOW`: Nominal operating levels.
  - **Mode B (Future Congestion Forecaster)**: Models the transition probability to the next measurement epoch ($t+1$).
    - Incorporates lag features ($t-1$) for bandwidth, throughput, latency, and loss.
    - Computes rolling moving averages over 3 epochs ($t-3$ to $t$).
    - Employs **chronological splitting** so that no future records contaminate the training split.

---

## 3. Network Monitoring Component

1. **System Network Collector (Psutil)**:
   - Queries `psutil.net_io_counters(pernic=True)`.
   - Computes differential rates ($\Delta \text{bytes} / \Delta t$) rather than reporting cumulative monotonically increasing counter totals.
   - Detects NIC resets and negative differentials.
2. **Defensive Packet Sniffer (Scapy)**:
   - Requires explicit operator start/stop action.
   - Analyzes packet headers and protocol counts (TCP, UDP, ICMP, ARP).
   - Strictly ignores application layer payload bytes to maintain privacy and security compliance.
