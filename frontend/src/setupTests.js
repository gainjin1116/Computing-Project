// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock D3 chart components to bypass D3 v7 ESM parsing in Create React App Jest
jest.mock('./components/charts/D3GaugeChart', () => () => <div data-testid="d3-gauge-chart" />);
jest.mock('./components/charts/D3ProbabilityDonut', () => () => <div data-testid="d3-probability-donut" />);
jest.mock('./components/charts/D3DiurnalTrend', () => () => <div data-testid="d3-diurnal-trend" />);
jest.mock('./components/charts/D3FeatureImportance', () => () => <div data-testid="d3-feature-importance" />);
jest.mock('./components/charts/D3WeatherClusters', () => () => <div data-testid="d3-weather-clusters" />);

// Mock Axios with persistent implementations surviving CRA resetMocks
jest.mock('axios');

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    const urlStr = String(url || '');
    if (urlStr.includes('/telemetry/latest')) {
      return Promise.resolve({
        status: 200,
        data: {
          station: 'Luddenham Station (Sydney SWAQ)',
          station_id: 'LUDD',
          timestamp: new Date().toISOString(),
          temp: 22.0,
          humidity: 62.0,
          wind_speed: 3.5,
          wind_dir: 45.0,
          rain: 0.0,
          pressure: 1016.0,
          hour: 10,
          day_of_week: 1,
          is_holiday: 0,
          estimated_pm25: 14.5,
          safety_tier: 'Safe',
          status: 'online'
        }
      });
    }
    if (urlStr.includes('/feature-importance')) {
      return Promise.resolve({
        status: 200,
        data: { LUDD_RH: 0.30, LUDD_T: 0.20, LUDD_p: 0.16 }
      });
    }
    return Promise.resolve({ status: 200, data: { status: 'online' } });
  });

  axios.post.mockImplementation((url, payload) => {
    const urlStr = String(url || '');
    if (urlStr.includes('/contact')) {
      return Promise.resolve({
        status: 200,
        data: {
          status: 'success',
          message: `Incident report from ${payload?.name || 'Staff'} (${payload?.role || 'Teacher'}) recorded successfully.`,
          incident_id: 'INC-202611049999'
        }
      });
    }
    if (urlStr.includes('/predict')) {
      return Promise.resolve({
        status: 200,
        data: {
          prediction: 0,
          label: 'Safe',
          probabilities: [0.92, 0.06, 0.02],
          estimated_pm25: 14.5,
          override_applied: false,
          is_fallback: false
        }
      });
    }
    return Promise.resolve({ status: 200, data: {} });
  });
});
