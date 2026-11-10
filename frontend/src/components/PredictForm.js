import React, { useState } from 'react';
import {
  Button,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Alert,
  Slider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  WbSunny as SunIcon,
  WaterDrop as RainIcon,
  Air as WindIcon,
  Whatshot as HeatIcon,
  CloudQueue as HazeIcon,
  RestartAlt as ResetIcon,
  Bolt as PredictIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const PRESETS = {
  calm: { name: 'Calm Sunny Morning', data: { temp: 22.0, humidity: 62.0, wind_speed: 3.5, wind_dir: 45, rain: 0.0, pressure: 1016.0, hour: 10, day_of_week: 1, is_holiday: 0 } },
  rainy: { name: 'Humid & Rainy', data: { temp: 17.5, humidity: 92.0, wind_speed: 6.0, wind_dir: 180, rain: 8.5, pressure: 1010.0, hour: 11, day_of_week: 2, is_holiday: 0 } },
  windy: { name: 'High Wind', data: { temp: 19.0, humidity: 45.0, wind_speed: 16.5, wind_dir: 270, rain: 0.0, pressure: 1013.0, hour: 12, day_of_week: 3, is_holiday: 0 } },
  heat: { name: 'Summer Heatwave', data: { temp: 32.0, humidity: 75.0, wind_speed: 1.5, wind_dir: 315, rain: 0.0, pressure: 1008.0, hour: 13, day_of_week: 4, is_holiday: 0 } },
  haze: { name: 'Bushfire Haze', data: { temp: 34.0, humidity: 28.0, wind_speed: 2.1, wind_dir: 290, rain: 0.0, pressure: 1021.0, hour: 12, day_of_week: 5, is_holiday: 0 } }
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '0.92rem',
  fontWeight: 600,
  color: '#0f172a',
  backgroundColor: '#f8fafc',
  outline: 'none',
  height: 40,
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease'
};

export default function PredictForm({ onPredict, onBackendStatusChange }) {
  const [formData, setFormData] = useState({ ...PRESETS.calm.data });
  const [loading, setLoading] = useState(false);
  const [, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hour' || name === 'day_of_week' || name === 'is_holiday' || name === 'wind_dir'
        ? Number(value)
        : value === '' ? '' : (parseFloat(value) || 0)
    }));
  };

  const handleSliderChange = (name) => (_, newValue) => {
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  // This function handles both clicking a preset and clicking the reset button.
  const applyPreset = (key) => {
    setFormData({ ...PRESETS[key].data });
    setErrors({});
    setInfoMessage(null);
  };

  const validate = () => {
    const newErrors = {};
    const t = Number(formData.temp);
    const h = Number(formData.humidity);
    const w = Number(formData.wind_speed);
    const r = Number(formData.rain);
    const p = Number(formData.pressure);

    if (isNaN(t) || t < -10 || t > 50) newErrors.temp = 'Temp: -10°C to 50°C';
    if (isNaN(h) || h < 0 || h > 100) newErrors.humidity = 'Humidity: 0% to 100%';
    if (isNaN(w) || w < 0 || w > 50) newErrors.wind_speed = 'Wind: 0 to 50 m/s';
    if (isNaN(r) || r < 0 || r > 100) newErrors.rain = 'Rain: ≥ 0 mm';
    if (isNaN(p) || p < 900 || p > 1100) newErrors.pressure = 'Pressure: 900 to 1100 hPa';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateLocalPrediction = (data) => {
    const rush = Math.exp(-Math.pow((data.hour - 8) / 2.5, 2)) + 0.6 * Math.exp(-Math.pow((data.hour - 18) / 2.5, 2));
    let baseEstimate = 12 + 1.6 * Math.max(0, data.temp - 20) - 0.25 * (data.humidity - 50) - 0.3 * data.wind_speed + 0.6 * (data.pressure - 1013) - 6 * data.rain + 5 * rush - (data.is_holiday ? 2 : 0);
    if (data.temp > 30.0 && data.humidity < 40.0) baseEstimate += 25.0;
    const pm25 = Math.max(1, Math.min(130, Math.round(baseEstimate * 10) / 10));

    let prediction = 0, label = 'Safe', probabilities = [0.92, 0.06, 0.02];
    if (pm25 > 50) { prediction = 2; label = 'Unsafe'; probabilities = [0.08, 0.18, 0.74]; }
    else if (pm25 > 25) { prediction = 1; label = 'Caution'; probabilities = [0.15, 0.72, 0.13]; }

    let overrideApplied = false;
    if (data.temp > 35 && data.humidity > 75 && data.wind_speed < 1.5) {
      prediction = 2; label = 'Unsafe'; probabilities = [0.04, 0.14, 0.82]; overrideApplied = true;
    } else if (data.temp > 30 && data.humidity > 70 && data.wind_speed < 3.0 && prediction === 0) {
      prediction = 1; label = 'Caution'; probabilities = [0.12, 0.75, 0.13]; overrideApplied = true;
    } else if (data.temp > 30 && data.humidity < 40 && data.wind_speed < 4.0) {
      prediction = 2; label = 'Unsafe'; probabilities = [0.05, 0.15, 0.80]; overrideApplied = true;
    }

    return { prediction, label, probabilities, estimated_pm25: pm25, is_fallback: true, override_applied: overrideApplied };
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    const submissionData = {
      ...formData,
      temp: Number(formData.temp),
      humidity: Number(formData.humidity),
      wind_speed: Number(formData.wind_speed),
      rain: Number(formData.rain),
      pressure: Number(formData.pressure)
    };

    setLoading(true);
    setInfoMessage(null);

    try {
      const response = await axios.post(`${API_BASE}/predict`, submissionData, { timeout: 2500 });
      if (onBackendStatusChange) onBackendStatusChange(true);
      const localEst = calculateLocalPrediction(submissionData);
      onPredict({ ...response.data, estimated_pm25: localEst.estimated_pm25, is_fallback: false, input_params: { ...submissionData } });
      setInfoMessage('Prediction retrieved from FastAPI backend.');
    } catch (err) {
      if (onBackendStatusChange) onBackendStatusChange(false);
      const localResult = calculateLocalPrediction(submissionData);
      onPredict({ ...localResult, input_params: { ...submissionData } });
      setInfoMessage('Backend offline — computed via local ML engine.');
    } finally {
      setLoading(false);
    }
  };

  // Renders a single slider row with clear labels and readable values
  const MetricRow = ({ label, value, unit, name, min, max, step, color = 'primary.main' }) => (
    <Box sx={{ my: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color }}>
          {value} {unit}
        </Typography>
      </Box>
      <Box sx={{ px: 0.5 }}>
        <Slider
          size="medium"
          value={typeof value === 'number' ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={handleSliderChange(name)}
          sx={{
            py: 1,
            '& .MuiSlider-thumb': { width: 15, height: 15 },
            '& .MuiSlider-track': { height: 5 },
            '& .MuiSlider-rail': { height: 5, opacity: 0.3 }
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        gap: 2
      }}
    >
      {/* Top Controls Container */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {/* Presets Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Typography sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.6, mr: 0.25 }}>
              Presets:
            </Typography>
            <Chip
              size="small"
              icon={<SunIcon sx={{ fontSize: '0.85rem !important', color: '#047857 !important' }} />}
              label="Calm"
              onClick={() => applyPreset('calm')}
              sx={{ height: 28, fontSize: '0.82rem', fontWeight: 700, color: '#047857', borderColor: '#047857', backgroundColor: '#ecfdf5', px: 0.5 }}
              variant="outlined"
              clickable
            />
            <Chip
              size="small"
              icon={<RainIcon sx={{ fontSize: '0.85rem !important', color: '#1d4ed8 !important' }} />}
              label="Rainy"
              onClick={() => applyPreset('rainy')}
              sx={{ height: 28, fontSize: '0.82rem', fontWeight: 700, color: '#1d4ed8', borderColor: '#1d4ed8', backgroundColor: '#eff6ff', px: 0.5 }}
              variant="outlined"
              clickable
            />
            <Chip
              size="small"
              icon={<WindIcon sx={{ fontSize: '0.85rem !important', color: '#0f766e !important' }} />}
              label="Windy"
              onClick={() => applyPreset('windy')}
              sx={{ height: 28, fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', borderColor: '#0f766e', backgroundColor: '#f0fdfa', px: 0.5 }}
              variant="outlined"
              clickable
            />
            <Chip
              size="small"
              icon={<HeatIcon sx={{ fontSize: '0.85rem !important', color: '#b45309 !important' }} />}
              label="Heat"
              onClick={() => applyPreset('heat')}
              sx={{ height: 28, fontSize: '0.82rem', fontWeight: 700, color: '#b45309', borderColor: '#b45309', backgroundColor: '#fffbeb', px: 0.5 }}
              variant="outlined"
              clickable
            />
            <Chip
              size="small"
              icon={<HazeIcon sx={{ fontSize: '0.85rem !important', color: '#b91c1c !important' }} />}
              label="Haze"
              onClick={() => applyPreset('haze')}
              sx={{ height: 28, fontSize: '0.82rem', fontWeight: 700, color: '#b91c1c', borderColor: '#b91c1c', backgroundColor: '#fef2f2', px: 0.5 }}
              variant="outlined"
              clickable
            />
          </Box>

          {/* Reset Button */}
          <Tooltip title="Reset to Defaults">
            <IconButton
              size="small"
              onClick={() => applyPreset('calm')}
              sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', p: 0.75, borderRadius: '10px' }}
            >
              <ResetIcon sx={{ fontSize: '1.15rem' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Backend Status Alert */}
        {infoMessage && (
          <Alert
            severity={infoMessage.includes('offline') ? 'info' : 'success'}
            sx={{ py: 0.5, fontSize: '0.82rem', borderRadius: 2 }}
            onClose={() => setInfoMessage(null)}
          >
            {infoMessage}
          </Alert>
        )}

        {/* Sliders Section: Evenly spaced with readable labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <MetricRow label="Temperature" value={formData.temp} unit="°C" name="temp" min={-5} max={45} step={0.5} />
          <MetricRow label="Humidity" value={formData.humidity} unit="%" name="humidity" min={0} max={100} step={1} />
          <MetricRow label="Wind Speed" value={formData.wind_speed} unit="m/s" name="wind_speed" min={0} max={30} step={0.5} />
          <MetricRow label="Rainfall" value={formData.rain} unit="mm" name="rain" min={0} max={40} step={0.5} />
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', my: 0.5 }} />

        {/* Dropdowns Section: Wind Dir & Pressure */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Wind Dir
            </Typography>
            <select name="wind_dir" value={formData.wind_dir} onChange={handleChange} style={inputStyle}>
              <option value={0}>N (0°)</option>
              <option value={45}>NE (45°)</option>
              <option value={90}>E (90°)</option>
              <option value={135}>SE (135°)</option>
              <option value={180}>S (180°)</option>
              <option value={225}>SW (225°)</option>
              <option value={270}>W (270°)</option>
              <option value={315}>NW (315°)</option>
            </select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Pressure (hPa)
            </Typography>
            <input type="number" name="pressure" value={formData.pressure} onChange={handleChange} style={inputStyle} />
          </Box>
        </Box>

        {/* Dropdowns Section: Hour, Day, Holiday */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Hour
            </Typography>
            <select name="hour" value={formData.hour} onChange={handleChange} style={inputStyle}>
              {[...Array(24)].map((_, h) => (
                <option key={h} value={h}>{`${h % 12 || 12}${h < 12 ? 'a' : 'p'}`}</option>
              ))}
            </select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Day
            </Typography>
            <select name="day_of_week" value={formData.day_of_week} onChange={handleChange} style={inputStyle}>
              <option value={0}>Mon</option>
              <option value={1}>Tue</option>
              <option value={2}>Wed</option>
              <option value={3}>Thu</option>
              <option value={4}>Fri</option>
              <option value={5}>Sat</option>
              <option value={6}>Sun</option>
            </select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Holiday
            </Typography>
            <select name="is_holiday" value={formData.is_holiday} onChange={handleChange} style={inputStyle}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </Box>
        </Box>
      </Box>

      {/* Calculate Button: Anchored firmly at bottom to align cleanly */}
      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider', mt: 1 }}>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PredictIcon />}
          sx={{
            fontWeight: 800,
            borderRadius: '12px',
            minHeight: 46,
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(0, 184, 148, 0.35)',
            textTransform: 'none'
          }}
        >
          {loading ? 'Calculating...' : 'Calculate Safety Level'}
        </Button>
      </Box>
    </Box>
  );
}
