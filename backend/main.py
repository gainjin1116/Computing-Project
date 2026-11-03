"""FastAPI service for the Recess Safety Advisor."""
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io

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
else:
    dataset_load_error = None

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

@app.get("/")
def read_root():
    return {"message": "Welcome to Recess Safety API", "version": app.version}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "dataset_loaded": not DATA.empty,
            "dataset_rows": int(len(DATA)), "model_error": model_load_error, "dataset_error": dataset_load_error}

@app.get("/feature-importance")
def get_feature_importance():
    if feature_importances is None:
        raise HTTPException(status_code=503, detail="Model files are unavailable. Run py train_save.py in the backend folder.")
    return {str(k): float(v) for k, v in feature_importances.items()}

@app.post("/predict")
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
        return {"prediction": prediction, "label": LABELS.get(prediction, "Unknown"),
                "probabilities": probabilities, "input_params": data.model_dump()}
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
    # Evenly spaced rows provide a reproducible view across the filtered dataset.
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
