

## Recess Safety Advisor API configuration

The frontend reads the API base URL from `REACT_APP_API_URL`. If it is not set, it uses `http://127.0.0.1:8000`. For another backend address, create a `.env` file in this folder with `REACT_APP_API_URL=http://127.0.0.1:8000` (change the address as needed), then restart the React development server.

## Historical visualisations

The Forecast & Trends page includes a weather radar profile, a weekday/hour PM2.5 heatmap, and an interactive temperature-versus-PM2.5 scatter plot. These use `/weekday-hour` and `/history` from the FastAPI service and therefore require the backend to be running. The CSV contains no calendar date, so the heatmap deliberately uses weekday and hour instead of inventing a yearly calendar. The historical export button downloads `/export/history.csv`.
