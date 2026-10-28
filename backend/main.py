from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

app = FastAPI(title="Recess Safety Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    scaler = joblib.load('scaler.pkl')
    model = joblib.load('rf_model.pkl')
    feature_importances = joblib.load('feature_importances.pkl')
except Exception as e:
    print("Warning, pls run train_save.py")

class WeatherInput(BaseModel):
    temp: float = Field(..., ge=-10, le=50, description="Temperature (C)")
    humidity: float = Field(..., ge=0, le=100, description="Humidity (%)")
    wind_speed: float = Field(..., ge=0, le=50, description="Wind Speed (m/s)")
    wind_dir: float = Field(..., ge=0, le=360, description="Wind Direction (deg)")
    rain: float = Field(..., ge=0, description="Rainfall (mm)")
    pressure: float = Field(..., ge=900, le=1100, description="Pressure (hPa)")
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    is_holiday: int = Field(..., ge=0, le=1)

@app.get("/")
def read_root():
    return {"message": "Welcome to Recess Safety API"}

@app.get("/feature-importance")
def get_feature_importance():
    return feature_importances

@app.post("/predict")
def predict_safety(data: WeatherInput):
    try:
        features = np.array([[
            data.temp, data.humidity, data.wind_speed, data.wind_dir,
            data.rain, data.pressure, data.hour, data.day_of_week, data.is_holiday
        ]])
        
        features_scaled = scaler.transform(features)
  
        prediction = int(model.predict(features_scaled)[0])
        probabilities = model.predict_proba(features_scaled)[0].tolist()
  
        labels = {0: "Safe", 1: "Caution", 2: "Unsafe"}
        
        return {
            "prediction": prediction,
            "label": labels[prediction],
            "probabilities": probabilities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))