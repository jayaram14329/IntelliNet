# IntelliNet — Intelligent Network Monitoring System for Intrusion Detection and Congestion Prediction

**Academic Engineering Full-Stack Capstone Project**  
Computer Networks • Machine Learning • Cybersecurity Engineering • Network Operations Center (NOC)

---

## 1. Abstract

Modern enterprise and campus computer networks face simultaneous challenges: defending against increasingly sophisticated cyberattacks (such as DDoS amplification, horizontal port scans, and brute-force botnets) while maintaining low latency, high throughput, and minimal packet loss. Traditional network administration relies on disparate, siloed tools—using signature-based IDS for security and static threshold monitoring for performance.

**IntelliNet** is a full-stack, intelligent network monitoring platform that combines **Machine Learning-driven Intrusion Detection** with **Statistical Network Congestion Forecasting** within a unified Network Operations Center (NOC) dashboard. Powered by a high-performance **FastAPI (Python)** backend, **Scikit-Learn** pipelines, **SQLite/SQLAlchemy** persistence, and an interactive **React 19 + TypeScript + Vite + Tailwind CSS** frontend, IntelliNet allows network administrators to evaluate raw network flows, distinguish benign heavy traffic from genuine security threats, and anticipate buffer exhaustion before packet degradation occurs.

---

## 2. Problem Statement

Network administrators routinely face three critical dilemmas:
1. **Ambiguity Between Heavy Load and Cyber Threats**: High packet volume may indicate legitimate streaming traffic or an ongoing volumetric Distributed Denial of Service (DDoS) attack. Standard threshold monitors cannot differentiate between them.
2. **Reactive Rather than Predictive Congestion Management**: Bufferbloat, queue overflow, and packet drop are typically identified only after latency spikes degrade user service.
3. **Complex, Disjointed Toolchains**: Packet sniffers (Wireshark), flow analyzers, and machine learning models are usually kept in disjoint scripts rather than integrated into an interactive, real-time dashboard.

IntelliNet resolves these challenges by consolidating flow classification, queuing telemetry, model evaluation, and defensive frame analysis into a single web application.

---

## 3. Project Objectives

- **Dual-Capability Intelligence**:
  - **Intrusion Detection**: Preprocess and classify flow records according to the Canadian Institute for Cybersecurity (**CIC-IDS2017**) benchmark schema using Random Forest, Decision Tree, and Logistic Regression ensembles.
  - **Congestion Prediction**: Compute deterministic queuing states (**Mode A**) and train chronological lag time-series forecasters (**Mode B**) to estimate congestion for the next measurement interval ($t+1$).
- **Defensive & Privacy-First Network Monitoring**: Collect local interface metrics via `Psutil` (differential rates, throughput in Mbps) and optional user-initiated `Scapy` packet inspection without storing sensitive application payloads.
- **Explainable AI**: Visualize Gini-impurity feature importances, stratified confusion matrices, and top contributing flow features for every individual prediction.
- **Interactive Cyber NOC Interface**: Deliver a dark cyber operations dashboard built with React 19, Recharts, Lucide icons, and JWT-authenticated role management (ADMIN vs. ANALYST).

---

## 4. System Architecture

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                     |
|                       React 19 + TypeScript + Vite + Tailwind CSS                     |
|         Recharts Telemetry Graphs | Status Badges | Cyber NOC Glassmorphic Layout     |
+---------------------------------------------------------------------------------------+
                                           |
                              REST APIs (JSON / Bearer JWT)
                                           v
+---------------------------------------------------------------------------------------+
|                                  FASTAPI BACKEND                                      |
|    +--------------------+  +----------------------+  +-----------------------------+  |
|    | Security & Auth    |  | Telemetry Collector  |  | Packet Sniffer Manager      |  |
|    | Bcrypt + PyJWT     |  | Psutil System Diffs  |  | Scapy Raw Frame Inspection  |  |
|    +--------------------+  +----------------------+  +-----------------------------+  |
|                                           |                                           |
|    +--------------------------------------+--------------------------------------+    |
|    |                        MACHINE LEARNING ENGINES                             |    |
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
|         SQLITE PERSISTENCE           |   |             ARTIFACT STORE                 |
| Users, Datasets, ModelVersions,      |   | .joblib serializations, confusion matrix   |
| Alerts, Observations, AuditLogs      |   | PNG evaluation plots, benchmark CSV files  |
+--------------------------------------+   +--------------------------------------------+
```

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Tooling**: Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`)
- **Routing**: React Router DOM v7
- **Visualization**: Recharts (Area, Line, Bar, and Pie Charts)
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT Authorization interceptors

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Validation**: Pydantic v2
- **ORM & Database**: SQLAlchemy 2.0 with SQLite (`intellinet.db`)
- **Security**: Passlib/Bcrypt password hashing, PyJWT Bearer token authentication
- **Network Collection**: Psutil (differential rate tracking), Scapy (optional defensive frame capture)

### Machine Learning
- **Libraries**: Scikit-Learn, Pandas, NumPy, Joblib
- **Visualization**: Matplotlib, Seaborn (for offline figures)
- **Algorithms**: Random Forest, Decision Tree, Logistic Regression

---

## 6. Dataset Sources & Methodology

### A. Intrusion Detection Dataset (CIC-IDS2017)
- **Official Source**: [Canadian Institute for Cybersecurity (UNB)](https://www.unb.ca/cic/datasets/ids-2017.html)
- **Schema**: 80 flow attributes extracted using CICFlowMeter (Forward/Backward packet lengths, IAT, flag tallies, flow bytes/s, flow packets/s).
- **Preprocessing Pipeline**:
  - Trims irregular whitespace and standardizes column headers.
  - Replaces $\pm\infty$ with `NaN` and applies median imputation.
  - Removes IP/port identifiers during model training to prevent memorization and leakage.
  - Performs stratified train/test splitting.

### B. Congestion Telemetry & Queuing Methodology
Congestion levels are evaluated against documented RFC buffer degradation boundaries:
- **`CRITICAL`**: Packet loss &gt; 5.0% OR Latency &gt; 150ms OR Bandwidth &gt; 90%
- **`HIGH`**: Packet loss &gt; 2.0% OR Latency &gt; 80ms OR Bandwidth &gt; 75%
- **`MEDIUM`**: Latency &gt; 40ms OR Bandwidth &gt; 50% OR Packet Loss &gt; 0.5%
- **`LOW`**: Nominal operating parameters (Latency $\le$ 40ms, Loss $\le$ 0.5%, Bandwidth $\le$ 50%)

**Mode B Forecasting Horizon**: Uses historical measurements ($t-1$ lag and 3-epoch rolling averages) to predict the state in epoch $t+1$. Training uses **chronological splitting** to guarantee no future data leakage.

### C. Synthetic Academic Benchmark Data
To allow immediate validation without requiring gigabytes of raw PCAPs, IntelliNet features built-in benchmark generators (`app.utils.dataset_generator`). All synthetic datasets are explicitly labeled with `is_synthetic: true` across the database and UI.

---

## 7. Launching & Managing the System

### ⚡ One-Click Windows Launchers (Recommended)
You can start or terminate the entire full-stack system with a single double-click in the project root:

- **Start Project (`run_intellinet.bat`)**:
  - Automatically starts the FastAPI backend on port 8000.
  - Automatically starts the React/Vite frontend on port 5173.
  - Automatically opens `http://localhost:5173` in your default browser.
- **Stop All Sessions (`stop_intellinet.bat`)**:
  - Instantly frees ports 8000 & 5173 and kills any dangling backend or frontend sessions cleanly.

---

### Manual Terminal Setup (Windows PowerShell)

### Prerequisites
- Python 3.11+
- Node.js v18+ and npm

---

### Step 1: Backend Setup & Launch

Open a Windows PowerShell terminal:

```powershell
# 1. Navigate to backend directory
cd C:\CN\backend

# 2. (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install Python dependencies
python -m pip install -r requirements.txt

# 4. Start the FastAPI application server
# (The application automatically creates database tables, default accounts, and trains initial baseline models on first launch!)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend server is accessible at `http://127.0.0.1:8000`.  
Interactive Swagger API docs: `http://127.0.0.1:8000/docs`.

---

### Step 2: Frontend Setup & Launch

Open a second Windows PowerShell terminal:

```powershell
# 1. Navigate to frontend directory
cd C:\CN\frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend dashboard will be available at `http://localhost:5173`.

---

## 8. Default Credentials

The system seeds default test accounts on initial startup:

| Role | Username | Email | Password |
|------|----------|-------|----------|
| **ADMIN** | `admin` | `admin@intellinet.local` | `Admin@123456` |
| **ANALYST** | `analyst` | `analyst@intellinet.local` | `Analyst@123456` |

*Tip: The login page includes quick-fill buttons for both accounts.*

---

## 9. Model Training & Offline Evaluation Commands

You can trigger model training and evaluation directly from the web interface or via standalone CLI scripts:

```powershell
# Train Intrusion Detection Model from terminal
cd C:\CN
python scripts/train_intrusion_model.py --algorithm RandomForest --samples 1500

# Train Congestion Forecaster from terminal
python scripts/train_congestion_model.py --algorithm RandomForest --samples 600

# Generate offline evaluation plots and confusion matrix figures
python scripts/evaluate_models.py
```

Generated plots will be saved in `C:\CN\artifacts\evaluation/`:
- `intrusion_confusion_matrix.png`
- `intrusion_feature_importance.png`
- `congestion_confusion_matrix.png`
- `congestion_feature_importance.png`

---

## 10. Running Automated Tests

Run the full pytest suite to verify authentication, ML pipelines, and API endpoints:

```powershell
cd C:\CN\backend
python -m pytest tests/ -v
```

Build the production frontend to verify TypeScript types and bundling:

```powershell
cd C:\CN\frontend
npm run build
```

---

## 11. Interactive Dashboard Pages

1. **Overview Dashboard (`/`)**: Real-time throughput, packet rate, dual-gauge congestion state (Current vs. Predicted), threat counts, and continuous telemetry graphs.
2. **Traffic Flow Explorer (`/traffic`)**: Raw flow inspection, protocol distributions, paginated tables, and class search.
3. **Intrusion Detection (`/intrusion`)**: Interactive single-flow classifier simulator with presets (Benign, SYN Flood, Nmap Scan, SSH BruteForce), confusion matrix, and feature importances.
4. **Congestion Prediction (`/congestion`)**: Dual Mode A and Mode B analysis, telemetry sliders, historical queuing graphs, and queuing criteria breakdown.
5. **Dataset Management (`/datasets`)**: Upload CSV datasets, validate schema headers, and generate synthetic benchmark datasets.
6. **Model Management (`/models`)**: Model version registry, retraining controls with algorithm selection (Random Forest, Decision Tree, Logistic Regression), and test split ratios.
7. **Security Alerts Center (`/alerts`)**: Filterable security incidents, severity badges, and flow inspection modal with Acknowledge/Resolve actions.
8. **Network Monitor (`/network`)**: Local interface selection, Psutil differential rate tracking, and explicit Scapy packet sniffer.
9. **Reports & History (`/reports`)**: System audit trail, printable report view, and CSV export of alerts.
10. **Settings (`/settings`)**: Configurable latency, packet loss, and bandwidth thresholds.

---

## 12. Known Limitations & Defensive Boundaries

1. **Npcap Permissions on Windows**: Raw promiscuous frame capture via Scapy requires Npcap with administrator privileges. In unprivileged environments, IntelliNet gracefully reports permission diagnostics while continuing full operation using operating system statistics (Psutil).
2. **Packet vs. Flow Features**: Models trained on flow-aggregated datasets (CIC-IDS2017) require bidirectional flow features (e.g., `flow_duration`, `total_fwd_packets`), which are distinct from raw instantaneous packet bytes.
3. **Model Estimation Disclaimer**: Intrusion detection and congestion predictions are statistical machine learning estimates and should be used to support, not replace, human network administrator judgment.

---

## 13. License & Academic Attribution
Developed as an academic engineering full-stack Computer Networks capstone project. Designed in accordance with defensive cybersecurity principles and ethical guidelines.
