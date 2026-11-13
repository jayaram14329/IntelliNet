import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "IntelliNet" in data["service"]

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "current_congestion" in data
    assert "live_metrics" in data
    assert "alerts_summary" in data

def test_auth_login_admin():
    response = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123456"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_network_statistics():
    response = client.get("/api/network/statistics")
    assert response.status_code == 200
    data = response.json()
    assert "throughput_mbps" in data
    assert "bandwidth_utilization_pct" in data

def test_network_interfaces():
    response = client.get("/api/network/interfaces")
    assert response.status_code == 200
    data = response.json()
    assert "interfaces" in data
    assert isinstance(data["interfaces"], list)

def test_intrusion_prediction_endpoint():
    flow = {
        "destination_port": 80,
        "flow_duration": 150000,
        "total_fwd_packets": 20,
        "total_backward_packets": 15,
        "total_length_of_fwd_packets": 2500,
        "total_length_of_bwd_packets": 5000,
        "flow_bytes_s": 50000,
        "flow_packets_s": 233,
        "syn_flag_count": 1,
        "fin_flag_count": 1,
        "rst_flag_count": 0,
        "psh_flag_count": 1,
        "ack_flag_count": 1
    }
    response = client.post("/api/intrusion/predict", json=flow)
    assert response.status_code == 200
    data = response.json()
    assert "classification" in data
    assert "confidence" in data
