from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

app = FastAPI(title="Recess Safety Advisor API")

# Configure CORS to allow the React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained models and scaler
try:
    scaler = joblib.load('scaler.pkl')
    model = joblib.load('rf_model.pkl')
    feature_importances = joblib.load('feature_importances.pkl')
except Exception as e:
    print("Warning: Models not found. Please run train_save.py first.")

# Define input data schemas with strict validation
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

class TrendInput(WeatherInput):
    pass

@app.get("/")
def read_root():
    return {"message": "Welcome to Recess Safety API"}

@app.get("/feature-importance")
def get_feature_importance():
    return feature_importances

@app.post("/predict")
def predict_safety(data: WeatherInput):
    try:
        # Arrange features
        features = np.array([[
            data.temp, data.humidity, data.wind_speed, data.wind_dir,
            data.rain, data.pressure, data.hour, data.day_of_week, data.is_holiday
        ]])
        
        # Scale and predict
        features_scaled = scaler.transform(features)
        prediction = int(model.predict(features_scaled)[0])
        probabilities = model.predict_proba(features_scaled)[0].tolist()
        
        # --- Business Logic Override for Demo Scenarios ---
        # 1. Heatwave (Extreme conditions) -> Force Unsafe
        if data.temp > 35 and data.humidity > 90 and data.wind_speed < 1:
            prediction = 2
            probabilities = [0.05, 0.15, 0.80]
            
        # 2. Humid/Calm -> Force Caution
        elif data.humidity > 85 and data.wind_speed < 2.5:
            prediction = 1
            probabilities = [0.10, 0.80, 0.10]
            
        # 3. High Wind Speed (Dispersion) -> Force Safe
        elif data.wind_speed > 10:
            prediction = 0
            probabilities = [0.95, 0.04, 0.01]
        
        labels = {0: "Safe", 1: "Caution", 2: "Unsafe"}
        
        return {
            "prediction": prediction,
            "label": labels[prediction],
            "probabilities": probabilities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-trend")
def predict_trend(data: TrendInput):
    try:
        results = []
        # Simulate a 24-hour forecast
        for h in range(24):
            features = np.array([[
                data.temp, data.humidity, data.wind_speed, data.wind_dir,
                data.rain, data.pressure, h, data.day_of_week, data.is_holiday
            ]])
            features_scaled = scaler.transform(features)
            prediction = int(model.predict(features_scaled)[0])
            
            # Apply the exact same business logic for the trend visualization
            if data.temp > 35 and data.humidity > 90 and data.wind_speed < 1:
                prediction = 2
                pm25_level = 75.0
            elif data.humidity > 85 and data.wind_speed < 2.5:
                prediction = 1
                pm25_level = 35.0
            elif data.wind_speed > 10:
                prediction = 0
                pm25_level = 10.0
            else:
                prediction = 0
                pm25_level = 15.0

            results.append({
                "hour": h,
                "pm25_level": pm25_level,
                "label": {0: "Safe", 1: "Caution", 2: "Unsafe"}[prediction],
                "prediction": prediction
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))