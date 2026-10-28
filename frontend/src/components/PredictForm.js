import React, { useState } from 'react';
import {
    Grid, TextField, Button, MenuItem, Box, CircularProgress
} from '@mui/material';
import axios from 'axios';

export default function PredictForm({ onPredict }) {
    const [formData, setFormData] = useState({
        temp: 25.0,
        humidity: 60.0,
        wind_speed: 3.5,
        wind_dir: 180,
        rain: 0.0,
        pressure: 1015.0,
        hour: 14,
        day_of_week: 3,
        is_holiday: 0,
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validate = () => {
        let tempErrors = {};
        if (formData.temp < -10 || formData.temp > 50) tempErrors.temp = "Temp must be between -10 and 50°C";
        if (formData.humidity < 0 || formData.humidity > 100) tempErrors.humidity = "Humidity must be between 0 and 100%";
        if (formData.pressure < 900 || formData.pressure > 1100) tempErrors.pressure = "Pressure must be between 900 and 1100 hPa";
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:8000/predict', formData);
            onPredict(response.data);
        } catch (error) {
            console.error("Error fetching prediction", error);
            alert("Error connecting to the backend API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Temperature (°C)" name="temp" type="number"
                        value={formData.temp} onChange={handleChange}
                        error={!!errors.temp} helperText={errors.temp}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Humidity (%)" name="humidity" type="number"
                        value={formData.humidity} onChange={handleChange}
                        error={!!errors.humidity} helperText={errors.humidity}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Wind Speed (m/s)" name="wind_speed" type="number"
                        value={formData.wind_speed} onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        select fullWidth label="Wind Direction (deg)" name="wind_dir"
                        value={formData.wind_dir} onChange={handleChange}
                    >
                        <MenuItem value={0}>North (0°)</MenuItem>
                        <MenuItem value={90}>East (90°)</MenuItem>
                        <MenuItem value={180}>South (180°)</MenuItem>
                        <MenuItem value={270}>West (270°)</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Rainfall (mm)" name="rain" type="number"
                        value={formData.rain} onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth label="Pressure (hPa)" name="pressure" type="number"
                        value={formData.pressure} onChange={handleChange}
                        error={!!errors.pressure} helperText={errors.pressure}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button
                        type="submit" variant="contained" color="primary"
                        fullWidth size="large" disabled={loading}
                        sx={{ mt: 2, py: 1.5 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Predict Safety Level'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}