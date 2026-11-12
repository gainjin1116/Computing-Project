# Recess Safety Advisor

**COS30049 Computing Technology Innovation Project - Assignment 3**
**Group 6:** Gain Jin, Kwan Kian Ann, Lee Zhao Shean, Lee Chee Cung (Swinburne University of Technology)

## Project Overview

Recess Safety Advisor is a full-stack web application designed to help school administrators, PE teachers, and nurses make real-time, data-driven decisions about outdoor student activities. By integrating atmospheric measurements with a Machine Learning model, the system predicts PM2.5 safety levels (Safe, Caution, Unsafe) and provides immediate, actionable health directives.

## Architecture & Technology Stack

This project uses a three-tier architecture:

*   **Frontend (Presentation Tier):** React 18, Material-UI (MUI) for layout and components, D3.js for interactive data visualisations.
*   **Backend (Application Tier):** FastAPI (Python) with Uvicorn, Pydantic for data validation, CORS middleware for frontend communication.
*   **Model & Data Tier:** Scikit-learn (Random Forest Pipeline), Pandas, Joblib, and a processed CSV dataset (`Processed_Sydney_AQI.csv`).

## Features

*   **Zero-Scroll "Flight Deck" UI:** Every critical metric fits within a single viewport without scrolling, adhering to human-factors principles (Nielsen, 1994).
*   **Safety-First Decision Engine:** Combines AI probability with hard-coded deterministic rules (e.g., heatwave stagnation, bushfire smoke) to override unsafe predictions.
*   **Real-time Telemetry:** Simulated live micro-climate polling every 30 seconds.
*   **Offline Fallback Engine:** If the FastAPI backend goes down, the frontend seamlessly switches to a physics-informed local calculation engine.
*   **Interactive D3 Visualisations:** Dynamic trend lines, weather radars, confusion matrices, and 7x24 heatmaps.

---

## Getting Started

### Prerequisites

*   **Node.js** (v16 or higher)
*   **Python** (v3.9 or higher)
*   **npm** (comes with Node.js)

### 1. Backend Setup (FastAPI)
Navigate to the `backend` directory and install the required Python packages:
    cd backend
    pip install -r requirements.txt

*(Note: Ensure `rf_model.pkl`, `scaler.pkl`, `feature_importances.pkl`, and `Processed_Sydney_AQI.csv` are present in the backend directory).*

Start the FastAPI server:
    py -m uvicorn main:app --reload

The API documentation is automatically available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup (React)
Open a new terminal, navigate to the frontend (root) directory, and install the dependencies:
    cd frontend
    npm install

Start the React development server:
    npm.cmd start

The application will launch at `http://localhost:3000`.

---

## Running Tests

Backend unit tests are written using `pytest` (located in `backend/test_main.py`).

To run the automated tests:

    cd backend
    pytest

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/predict` | Classifies weather conditions, applies safety overrides, and returns directives. |
| `POST` | `/contact` | Submits incident reports to the school health officer. |
| `GET` | `/telemetry/latest` | Returns simulated live atmospheric telemetry. |
| `GET` | `/history` | Returns a bounded sample of historical PM2.5 observations. |
| `GET` | `/feature-importance` | Returns Random Forest feature importance scores. |
| `GET` | `/weekday-hour` | Aggregates PM2.5 by weekday and hour for the heatmap. |