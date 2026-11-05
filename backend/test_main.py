import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# =============================================================================
# A. Input Schema Validation
# =============================================================================

def test_valid_prediction_request_accepted():
    payload = {
        "temp": 22.0,
        "humidity": 60.0,
        "wind_speed": 4.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "pressure": 1013.25,
        "hour": 11,
        "day_of_week": 2,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "label" in data
    assert "probabilities" in data
    assert "estimated_pm25" in data
    assert data["label"] in ["Safe", "Caution", "Unsafe"]

def test_missing_required_fields_returns_422():
    # Payload missing 'humidity' and 'pressure'
    incomplete_payload = {
        "temp": 22.0,
        "wind_speed": 4.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "hour": 11,
        "day_of_week": 2,
        "is_holiday": 0
    }
    response = client.post("/predict", json=incomplete_payload)
    assert response.status_code == 422
    assert "detail" in response.json()

def test_incorrect_data_types_rejected_with_422():
    # String passed instead of float for temperature
    invalid_type_payload = {
        "temp": "very_hot",
        "humidity": 60.0,
        "wind_speed": 4.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "pressure": 1013.25,
        "hour": 11,
        "day_of_week": 2,
        "is_holiday": 0
    }
    response = client.post("/predict", json=invalid_type_payload)
    assert response.status_code == 422

def test_unexpected_payload_fields_do_not_crash_server():
    payload = {
        "temp": 20.0,
        "humidity": 50.0,
        "wind_speed": 5.0,
        "wind_dir": 180.0,
        "rain": 0.0,
        "pressure": 1015.0,
        "hour": 12,
        "day_of_week": 3,
        "is_holiday": 0,
        "extra_field": "unexpected_data",
        "another_field": 12345
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

# =============================================================================
# B. Temperature Boundary Testing (-10°C to 50°C)
# =============================================================================

@pytest.mark.parametrize("temp_val", [-10.0, 0.0, 25.0, 50.0])
def test_temperature_within_boundary_accepted(temp_val):
    payload = {
        "temp": temp_val,
        "humidity": 50.0,
        "wind_speed": 5.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "pressure": 1013.0,
        "hour": 10,
        "day_of_week": 1,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert response.json()["estimated_pm25"] >= 0

def test_temperature_below_minimum_boundary_rejected():
    payload = {
        "temp": -11.0,  # Below -10°C minimum
        "humidity": 50.0,
        "wind_speed": 5.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "pressure": 1013.0,
        "hour": 10,
        "day_of_week": 1,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "temp" in str(response.json()["detail"])

def test_temperature_above_maximum_boundary_rejected():
    payload = {
        "temp": 51.0,  # Above 50°C maximum
        "humidity": 50.0,
        "wind_speed": 5.0,
        "wind_dir": 90.0,
        "rain": 0.0,
        "pressure": 1013.0,
        "hour": 10,
        "day_of_week": 1,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "temp" in str(response.json()["detail"])

# =============================================================================
# C. Prediction API Testing & Safety Overrides
# =============================================================================

def test_prediction_response_contract_and_structure():
    payload = {
        "temp": 18.0,
        "humidity": 55.0,
        "wind_speed": 7.0,
        "wind_dir": 90.0,
        "rain": 2.0,
        "pressure": 1014.0,
        "hour": 10,
        "day_of_week": 2,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["prediction"], int)
    assert isinstance(data["label"], str)
    assert isinstance(data["probabilities"], list)
    assert len(data["probabilities"]) == 3
    assert pytest.approx(sum(data["probabilities"]), 0.01) == 1.0
    assert isinstance(data["estimated_pm25"], (int, float))
    assert isinstance(data["override_applied"], bool)
    assert isinstance(data["is_fallback"], bool)

def test_extreme_heatwave_triggers_unsafe_override():
    # Stagnant heatwave: temp > 35, humidity > 75, wind < 1.5
    heatwave_payload = {
        "temp": 38.0,
        "humidity": 85.0,
        "wind_speed": 0.5,
        "wind_dir": 315.0,
        "rain": 0.0,
        "pressure": 1022.0,
        "hour": 12,
        "day_of_week": 4,
        "is_holiday": 0
    }
    response = client.post("/predict", json=heatwave_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == 2
    assert data["label"] == "Unsafe"
    assert data["override_applied"] is True

def test_moderate_inversion_triggers_caution_override():
    # Warm stagnant condition: temp > 30, humidity > 70, wind < 3.0
    caution_payload = {
        "temp": 32.0,
        "humidity": 74.0,
        "wind_speed": 1.2,
        "wind_dir": 270.0,
        "rain": 0.0,
        "pressure": 1016.0,
        "hour": 11,
        "day_of_week": 1,
        "is_holiday": 0
    }
    response = client.post("/predict", json=caution_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in [1, 2]
    assert data["label"] in ["Caution", "Unsafe"]

# =============================================================================
# D. API Error Handling & Edge Cases
# =============================================================================

def test_missing_request_body_returns_422():
    response = client.post("/predict")
    assert response.status_code == 422

def test_malformed_json_returns_422():
    response = client.post(
        "/predict",
        content="This is not JSON",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422

def test_out_of_range_humidity_rejected():
    payload = {
        "temp": 20.0,
        "humidity": 150.0,  # Max 100%
        "wind_speed": 5.0,
        "wind_dir": 45.0,
        "rain": 0.0,
        "pressure": 1013.0,
        "hour": 10,
        "day_of_week": 1,
        "is_holiday": 0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422

def test_contact_form_invalid_email_format_rejected():
    invalid_contact = {
        "name": "Alex Smith",
        "role": "Teacher",
        "email": "not-a-valid-email",
        "message": "Smoke seen on oval."
    }
    response = client.post("/contact", json=invalid_contact)
    assert response.status_code == 422
    assert "Invalid email format" in response.json()["detail"]

def test_settings_thresholds_invalid_range_rejected():
    # safe_max must be strictly less than caution_max
    invalid_thresholds = {
        "safe_max": 50.0,
        "caution_max": 25.0
    }
    response = client.put("/settings/thresholds", json=invalid_thresholds)
    assert response.status_code == 400

# =============================================================================
# E. Integration Testing & Full Lifecycle
# =============================================================================

def test_root_health_check_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Luddenham" in data["station"]

def test_feature_importance_endpoint():
    response = client.get("/feature-importance")
    assert response.status_code == 200
    data = response.json()
    assert "LUDD_RH" in data
    assert "LUDD_T" in data
    assert pytest.approx(sum(data.values()), 0.05) == 1.0

def test_latest_telemetry_endpoint_provides_real_time_sync():
    response = client.get("/telemetry/latest")
    assert response.status_code == 200
    data = response.json()
    assert "station" in data
    assert "timestamp" in data
    assert "temp" in data
    assert "humidity" in data
    assert "wind_speed" in data
    assert "pressure" in data
    assert "estimated_pm25" in data
    assert data["status"] == "online"

def test_contact_submission_full_cycle():
    valid_contact = {
        "name": "Sarah Connor",
        "role": "PE Coordinator",
        "email": "s.connor@sydney.edu.au",
        "message": "Hazard reduction smoke detected near football oval."
    }
    response = client.post("/contact", json=valid_contact)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "incident_id" in data
    assert "INC-" in data["incident_id"]
    assert data["received_data"]["name"] == "Sarah Connor"

def test_threshold_settings_get_and_put_cycle():
    # Update thresholds
    update_payload = {"safe_max": 22.0, "caution_max": 48.0}
    put_res = client.put("/settings/thresholds", json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["thresholds"]["safe_max"] == 22.0

    # Retrieve thresholds via GET
    get_res = client.get("/settings/thresholds")
    assert get_res.status_code == 200
    assert get_res.json()["safe_max"] == 22.0
    assert get_res.json()["caution_max"] == 48.0
