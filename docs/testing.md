# IntelliNet Testing Guide

## 1. Running Automated Backend Tests

The backend test suite verifies authentication, dataset validation, machine learning pipeline training, inference, and REST endpoints.

To run tests on Windows PowerShell:

```powershell
cd C:\CN\backend
python -m pytest tests/ -v
```

### Verified Test Cases:
1. `test_health_check`: Validates FastAPI lifecycle and model registry health.
2. `test_dashboard_summary`: Validates aggregate statistics and live telemetry retrieval.
3. `test_auth_login_admin`: Tests bcrypt password verification and JWT token issuance.
4. `test_network_statistics`: Verifies that differential counter math handles non-negative rates.
5. `test_network_interfaces`: Validates local NIC discovery.
6. `test_intrusion_prediction_endpoint`: Validates end-to-end inference on synthetic flow inputs.
7. `test_intrusion_pipeline_training_and_predict`: Verifies feature extraction, tree fitting, and confidence calculation.
8. `test_congestion_label_methodology`: Validates adherence to RFC queuing degradation thresholds.
9. `test_congestion_pipeline_training_and_predict`: Verifies chronological lag creation and forecasting.

---

## 2. Running Frontend Production Build Verification

To test that TypeScript types, Vite bundling, and Tailwind CSS compile with zero errors:

```powershell
cd C:\CN\frontend
npm run build
```

---

## 3. Running Offline Model Evaluation Script

To generate offline visual figures and plots for research reports:

```powershell
cd C:\CN
python scripts/evaluate_models.py
```

Generated evaluation artifacts are stored in `C:\CN\artifacts\evaluation/`:
- `intrusion_confusion_matrix.png`
- `intrusion_feature_importance.png`
- `congestion_confusion_matrix.png`
- `congestion_feature_importance.png`
