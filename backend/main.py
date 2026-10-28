from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

app = FastAPI(title="Recess Safety Advisor API")

# Configure CORS to allow React frontend to communicate
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

# Define input data schema with strict validation using Pydantic
class WeatherInput(BaseModel):
    temp: float = Field(..., ge=-10, le=50, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative Humidity percentage")
    wind_speed: float = Field(..., ge=0, le=50, description="Wind Speed in m/s")
    wind_dir: float = Field(..., ge=0, le=360, description="Wind Direction in degrees")
    rain: float = Field(..., ge=0, description="Rainfall in mm")
    pressure: float = Field(..., ge=900, le=1100, description="Atmospheric Pressure in hPa")
    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of the week (0=Monday, 6=Sunday)")
    is_holiday: int = Field(..., ge=0, le=1, description="Is it a public holiday? (0=No, 1=Yes)")

@app.get("/")
def read_root():
    return {"message": "Welcome to Recess Safety API"}

@app.get("/feature-importance")
def get_feature_importance():
    return feature_importances

@app.post("/predict")
def predict_safety(data: WeatherInput):
    try:
        # Arrange features in the exact order expected by the model
        features = np.array([[
            data.temp, data.humidity, data.wind_speed, data.wind_dir,
            data.rain, data.pressure, data.hour, data.day_of_week, data.is_holiday
        ]])
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict class and probabilities
        prediction = int(model.predict(features_scaled)[0])
        probabilities = model.predict_proba(features_scaled)[0].tolist()
        
        # --- Business Logic Override (Mitigating Accuracy Paradox) ---
        # The Random Forest from Assignment 2 suffered from severe class imbalance, 
        # heavily favoring the "Safe" class. To ensure child safety, we implement 
        # a deterministic rule-based override for extreme weather conditions.
        if data.temp > 35 and data.humidity > 90 and data.wind_speed < 1:
            prediction = 2  # Force Unsafe
            probabilities = [0.05, 0.15, 0.80]  # Mock probability distribution
        elif data.temp > 30 and data.humidity > 70 and data.wind_speed < 3:
            prediction = 1  # Force Caution
            probabilities = [0.15, 0.70, 0.15]
        
        labels = {0: "Safe", 1: "Caution", 2: "Unsafe"}
        
        return {
            "prediction": prediction,
            "label": labels[prediction],
            "probabilities": probabilities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))