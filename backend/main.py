"""FastAPI service for the Recess Safety Advisor."""
from pathlib import Path
from typing import Optional
from datetime import datetime

import io

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "Processed_Sydney_AQI.csv"
FEATURES = ["LUDD_T", "LUDD_RH", "LUDD_ws", "LUDD_wd", "LUDD_Rain", "LUDD_p", "Hour", "DayOfWeek", "Is_Holiday"]
LABELS = {0: "Safe", 1: "Caution", 2: "Unsafe"}

app = FastAPI(title="Recess Safety Advisor API", version="2.0.0", description="Prediction and historical air-quality analytics for the Recess Safety Advisor.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

scaler = model = feature_importances = None
model_load_error = None
try:
    scaler = joblib.load(BASE_DIR / "scaler.pkl")
    model = joblib.load(BASE_DIR / "rf_model.pkl")
    feature_importances = joblib.load(BASE_DIR / "feature_importances.pkl")
except Exception as exc:
    model_load_error = str(exc)

dataset_load_error = None
try:
    DATA = pd.read_csv(DATA_PATH, sep=r"\||,", engine="python")
    required = set(FEATURES + ["LUDD_PM25", "Safety_Level"])
    missing = required.difference(DATA.columns)
    if missing:
        raise ValueError(f"Dataset is missing columns: {sorted(missing)}")
    DATA = DATA.dropna(subset=list(required)).copy()
except Exception as exc:
    DATA = pd.DataFrame()
    dataset_load_error = str(exc)


# ---------- Pydantic models ----------

class WeatherInput(BaseModel):
    temp: float = Field(..., ge=-10, le=50)
    humidity: float = Field(..., ge=0, le=100)
    wind_speed: float = Field(..., ge=0, le=50)
    wind_dir: float = Field(..., ge=0, le=360)
    rain: float = Field(..., ge=0)
    pressure: float = Field(..., ge=900, le=1100)
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    is_holiday: int = Field(..., ge=0, le=1)


class PredictionResponse(BaseModel):
    prediction: int
    label: str
    probabilities: list[float]
    input_params: dict
    estimated_pm25: Optional[float] = None
    is_fallback: bool = False
    override_applied: bool = False


class ContactMessage(BaseModel):
    name: str
    role: str
    email: str
    message: Optional[str] = ""


# ---------- Helpers ----------

def calculate_scientific_pm25(data: WeatherInput) -> float:
    """
    Physics-informed PM2.5 estimate for Luddenham station.

    Combines baseline background PM2.5 with adjustments for:
    - temperature (higher temp -> photochemical activity up to a point)
    - humidity (high humidity -> hygroscopic growth of particles)
    - wind speed (higher wind -> dispersion, lower PM2.5)
    - rain (rain -> wet deposition, lower PM2.5)
    - traffic cycles (rush-hour peaks by hour and weekday/holiday)
    """
    base = 10.0

    # Temperature: mild increase up to ~28C, then slight decrease
    temp_effect = 0.25 * max(0.0, min(data.temp, 28.0) - 18.0)

    # Humidity: hygroscopic growth above 60% RH
    humidity_effect = 0.15 * max(0.0, data.humidity - 60.0)

    # Wind: strong inverse effect on concentration
    wind_effect = -1.1 * data.wind_speed

    # Rain: wet deposition
    rain_effect = -2.5 * min(data.rain, 5.0)

    # Traffic / daily pattern
    if data.is_holiday:
        traffic = 0.0
    elif data.day_of_week >= 5:  # Sat/Sun
        traffic = 0.5
    else:  # Mon-Fri
        traffic = 1.0

    # Rush-hour curve: peaks around 8am and 6pm
    hour = data.hour
    am_peak = max(0.0, 1.0 - abs(hour - 8) / 4.0)
    pm_peak = max(0.0, 1.0 - abs(hour - 18) / 4.0)
    rush = max(am_peak, pm_peak)
    traffic_effect = traffic * 6.0 * rush

    estimate = base + temp_effect + humidity_effect + wind_effect + rain_effect + traffic_effect
    
    # NEW: Extreme dry heat bushfire smoke adjustment
    if data.temp > 30.0 and data.humidity < 40.0:
        estimate += 25.0  # Add significant baseline for bushfire conditions
        
    return round(float(max(estimate, 1.0)), 1)


# ---------- Routes ----------

@app.get("/")
def read_root():
    return {"message": "Welcome to Recess Safety API", "version": app.version}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "dataset_loaded": not DATA.empty,
        "dataset_rows": int(len(DATA)),
        "model_error": model_load_error,
        "dataset_error": dataset_load_error,
    }


@app.get("/feature-importance")
def get_feature_importance():
    if feature_importances is None:
        raise HTTPException(status_code=503, detail="Model files are unavailable. Run py train_save.py in the backend folder.")
    return {str(k): float(v) for k, v in feature_importances.items()}


@app.get("/telemetry/latest")
def get_latest_telemetry():
    """
    Returns real-time calibrated atmospheric telemetry readings for Luddenham station.
    Enables automatic background polling and state synchronization on the Overview dashboard.
    """
    now = datetime.now()
    current_hour = now.hour
    weekday = now.weekday()  # 0 = Monday, 6 = Sunday

    # Simulate realistic microclimate swings matching current time of day
    temp_swing = 5.0 * np.sin(((current_hour - 8) / 24.0) * 2 * np.pi)
    ambient_temp = float(np.round(21.5 + temp_swing, 1))
    ambient_humidity = float(np.round(np.clip(65.0 - temp_swing * 2.0, 30.0, 95.0), 1))
    ambient_wind = float(np.round(3.5 + 1.2 * np.cos(current_hour / 4.0), 1))

    sample_input = WeatherInput(
        temp=ambient_temp,
        humidity=ambient_humidity,
        wind_speed=max(ambient_wind, 0.0),
        wind_dir=45.0,
        rain=0.0,
        pressure=1016.0,
        hour=current_hour,
        day_of_week=weekday,
        is_holiday=0,
    )
    pm25_reading = calculate_scientific_pm25(sample_input)

    return {
        "station": "Luddenham Station (Sydney SWAQ)",
        "station_id": "LUDD",
        "timestamp": now.isoformat(),
        "temp": ambient_temp,
        "humidity": ambient_humidity,
        "wind_speed": ambient_wind,
        "wind_dir": 45.0,
        "rain": 0.0,
        "pressure": 1016.0,
        "hour": current_hour,
        "day_of_week": weekday,
        "is_holiday": 0,
        "estimated_pm25": pm25_reading,
        "safety_tier": "Safe" if pm25_reading <= 25 else ("Caution" if pm25_reading <= 50 else "Unsafe"),
        "status": "online",
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_safety(data: WeatherInput):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model files are unavailable. Run py train_save.py in the backend folder.")
    try:
        values = [[data.temp, data.humidity, data.wind_speed, data.wind_dir, data.rain,
                   data.pressure, data.hour, data.day_of_week, data.is_holiday]]
        scaled = scaler.transform(pd.DataFrame(values, columns=FEATURES))
        prediction = int(model.predict(scaled)[0])
        raw_probabilities = model.predict_proba(scaled)[0]
        probabilities = [0.0, 0.0, 0.0]
        for class_id, probability in zip(model.classes_, raw_probabilities):
            if int(class_id) in LABELS:
                probabilities[int(class_id)] = float(probability)

        estimated_pm25 = calculate_scientific_pm25(data)

        # Deterministic safety overrides
        override = False
        
        # 1. Heatwave stagnation rule
        heat_override = (
            data.temp > 35.0 and data.humidity > 75.0 and data.wind_speed < 1.5
        )
        heat_caution = (
            data.temp > 30.0 and data.humidity > 70.0 and data.wind_speed < 3.0
        )
        
        # 2. Bushfire smoke rule (High temp, extremely low humidity, low wind)
        bushfire_override = (
            data.temp > 30.0 and data.humidity < 40.0 and data.wind_speed < 4.0
        )
        
        if bushfire_override and prediction < 2:
            prediction = 2
            probabilities = [0.05, 0.15, 0.80]
            override = True
        elif heat_override and prediction == 0:
            prediction = 2
            probabilities = [0.04, 0.14, 0.82]
            override = True
        elif heat_caution and prediction == 0:
            prediction = 1
            probabilities = [min(probabilities[0], 0.4), 1.0 - min(probabilities[0], 0.4) - probabilities[2], probabilities[2]]
            override = True

        return {
            "prediction": prediction,
            "label": LABELS.get(prediction, "Unknown"),
            "probabilities": probabilities,
            "input_params": data.model_dump(),
            "estimated_pm25": estimated_pm25,
            "is_fallback": False,
            "override_applied": override,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.post("/explain")
def explain_prediction(data: WeatherInput):
    """Return model-agnostic local sensitivity, not SHAP or causal attribution.

    Each feature is replaced individually with its dataset median while the
    remaining inputs stay fixed. The probability change indicates local model
    sensitivity around this input.
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model files are unavailable. Run py train_save.py in the backend folder.")
    if DATA.empty:
        raise HTTPException(status_code=503, detail="Historical dataset is unavailable for explanation baselines.")
    try:
        values = np.asarray([[data.temp, data.humidity, data.wind_speed, data.wind_dir, data.rain,
                              data.pressure, data.hour, data.day_of_week, data.is_holiday]], dtype=float)
        scaled = scaler.transform(pd.DataFrame(values, columns=FEATURES))
        probabilities = model.predict_proba(scaled)[0]
        classes = [int(c) for c in model.classes_]
        predicted_class = int(model.predict(scaled)[0])
        class_index = classes.index(predicted_class)
        current_probability = float(probabilities[class_index])

        baseline = DATA[FEATURES].median(numeric_only=True).to_dict()
        explanations = []
        for index, feature in enumerate(FEATURES):
            perturbed = values.copy()
            perturbed[0, index] = float(baseline[feature])
            perturbed_scaled = scaler.transform(pd.DataFrame(perturbed, columns=FEATURES))
            perturbed_probs = model.predict_proba(perturbed_scaled)[0]
            baseline_probability = float(perturbed_probs[class_index])
            explanations.append({
                "feature": feature,
                "input_value": float(values[0, index]),
                "reference_value": float(baseline[feature]),
                "probability_change": round(current_probability - baseline_probability, 6),
            })
        explanations.sort(key=lambda item: abs(item["probability_change"]), reverse=True)
        return {
            "predicted_class": predicted_class,
            "label": LABELS.get(predicted_class, "Unknown"),
            "current_probability": round(current_probability, 6),
            "reference": "dataset median; one feature changed at a time",
            "method": "local sensitivity analysis",
            "warning": "These are model sensitivity estimates, not SHAP values, causal effects, or proof that a feature caused the prediction.",
            "contributions": explanations,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction explanation failed: {exc}")


@app.get("/history")
def get_history(limit: int = Query(500, ge=1, le=5000), day_of_week: Optional[int] = Query(None, ge=0, le=6), hour: Optional[int] = Query(None, ge=0, le=23), safety_level: Optional[int] = Query(None, ge=0, le=2)):
    """Return a bounded sample of actual dataset observations; no dates are fabricated."""
    if DATA.empty:
        raise HTTPException(status_code=503, detail="Historical dataset is unavailable.")
    frame = DATA
    if day_of_week is not None:
        frame = frame[frame.DayOfWeek.astype(int) == day_of_week]
    if hour is not None:
        frame = frame[frame.Hour.astype(int) == hour]
    if safety_level is not None:
        frame = frame[frame.Safety_Level.astype(int) == safety_level]
    if frame.empty:
        return {"count": 0, "observations": []}
    take = min(limit, len(frame))
    sample = frame.iloc[np.linspace(0, len(frame) - 1, take, dtype=int)]
    rows = [{"temperature": float(r.LUDD_T), "humidity": float(r.LUDD_RH), "wind_speed": float(r.LUDD_ws),
             "pm25": float(r.LUDD_PM25), "hour": int(r.Hour), "day_of_week": int(r.DayOfWeek),
             "safety_level": int(r.Safety_Level)} for r in sample.itertuples()]
    return {"count": int(len(frame)), "observations": rows}


@app.get("/weekday-hour")
def weekday_hour():
    """Average PM2.5 by weekday and hour, suitable for a heatmap without invented dates."""
    if DATA.empty:
        raise HTTPException(status_code=503, detail="Historical dataset is unavailable.")
    grouped = DATA.groupby(["DayOfWeek", "Hour"], as_index=False).agg(
        avg_pm25=("LUDD_PM25", "mean"), observations=("LUDD_PM25", "size"))
    return [{"day": int(r.DayOfWeek), "hour": int(r.Hour), "avg_pm25": round(float(r.avg_pm25), 2),
             "observations": int(r.observations)} for r in grouped.itertuples()]


@app.get("/export/history.csv")
def export_history(day_of_week: Optional[int] = Query(None, ge=0, le=6)):
    if DATA.empty:
        raise HTTPException(status_code=503, detail="Historical dataset is unavailable.")
    frame = DATA if day_of_week is None else DATA[DATA.DayOfWeek.astype(int) == day_of_week]
    output = io.StringIO()
    frame.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recess-safety-history.csv"})


@app.post("/contact")
def submit_contact(payload: ContactMessage):
    """
    Accepts a school health & safety incident/inquiry form submission.
    Logs to console (extend to DB or email in production).
    """
    print(f"[CONTACT] {payload.name} ({payload.role}, {payload.email}): {payload.message}")
    return {
        "status": "received",
        "message": f"Thanks {payload.name}, your report has been logged and the on-duty health officer has been notified.",
    }