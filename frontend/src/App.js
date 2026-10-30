import React, { useState, useEffect } from 'react';
import {
    Box, CssBaseline, Drawer, AppBar, Toolbar, Typography,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    ThemeProvider, createTheme, Grid, Paper
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import axios from 'axios';

import PredictForm from './components/PredictForm';
import ProbabilityDonut from './components/charts/ProbabilityDonut';
import FeatureBar from './components/charts/FeatureBar';
import TrendLineChart from './components/charts/TrendLineChart';
import GaugeChart from './components/charts/GaugeChart';

const drawerWidth = 240;

// Light Blue Campus Theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#0288d1' }, // Sky Blue
        secondary: { main: '#4caf50' }, // Green for safety
        background: { default: '#f0f8ff' } // Very light blue background
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    }
});

export default function App() {
    const [activeTab, setActiveTab] = useState('predict');
    const [predictionResult, setPredictionResult] = useState(null);
    const [featureImportance, setFeatureImportance] = useState(null);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/feature-importance')
            .then(res => setFeatureImportance(res.data))
            .catch(err => console.error("Error fetching features:", err));
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex' }}>

                {/* Top App Bar */}
                <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#0277bd' }}>
                    <Toolbar>
                        <SchoolIcon sx={{ mr: 2, color: '#b3e5fc' }} />
                        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                            Recess Safety Advisor
                        </Typography>
                        <ChildCareIcon sx={{ color: '#b3e5fc' }} />
                    </Toolbar>
                </AppBar>

                {/* Sidebar Navigation */}
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#e1f5fe', borderRight: 'none' }
                    }}
                >
                    <Toolbar />
                    <Box sx={{ overflow: 'auto', mt: 2 }}>
                        <List>
                            <ListItem disablePadding>
                                <ListItemButton
                                    selected={activeTab === 'predict'}
                                    onClick={() => setActiveTab('predict')}
                                    sx={{ '&.Mui-selected': { bgcolor: '#b3e5fc', borderLeft: '5px solid #0288d1' } }}
                                >
                                    <ListItemIcon sx={{ color: activeTab === 'predict' ? '#0288d1' : '#546e7a' }}><VaccinesIcon /></ListItemIcon>
                                    <ListItemText primary="Prediction" primaryTypographyProps={{ fontWeight: activeTab === 'predict' ? 'bold' : 'normal' }} />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton
                                    selected={activeTab === 'analytics'}
                                    onClick={() => setActiveTab('analytics')}
                                    sx={{ '&.Mui-selected': { bgcolor: '#b3e5fc', borderLeft: '5px solid #0288d1' } }}
                                >
                                    <ListItemIcon sx={{ color: activeTab === 'analytics' ? '#0288d1' : '#546e7a' }}><QueryStatsIcon /></ListItemIcon>
                                    <ListItemText primary="Analytics" primaryTypographyProps={{ fontWeight: activeTab === 'analytics' ? 'bold' : 'normal' }} />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Box>
                </Drawer>

                {/* Main Content Area */}
                <Box component="main" sx={{ flexGrow: 1, p: 4, mt: 8, bgcolor: '#f0f8ff', minHeight: '100vh' }}>

                    {activeTab === 'predict' && (
                        <Grid container spacing={4}>
                            <Grid item xs={12} lg={5}>
                                <Paper sx={{ p: 4, borderRadius: 4, boxShadow: '0 8px 24px rgba(2, 136, 209, 0.1)' }}>
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#0277bd', mb: 3 }}>
                                        Weather Parameters
                                    </Typography>
                                    <PredictForm onPredict={setPredictionResult} />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} lg={7}>
                                <Paper sx={{ p: 4, borderRadius: 4, minHeight: '400px', boxShadow: '0 8px 24px rgba(2, 136, 209, 0.1)' }}>
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#0277bd', mb: 3 }}>
                                        Safety Prediction
                                    </Typography>

                                    {predictionResult ? (
                                        <Box sx={{ textAlign: 'center' }}>
                                            {/* Result Badge */}
                                            <Box sx={{
                                                display: 'inline-block',
                                                px: 5, py: 1.5, borderRadius: 50, mb: 3,
                                                bgcolor: predictionResult.prediction === 0 ? '#e8f5e9' : predictionResult.prediction === 1 ? '#fff3e0' : '#ffebee',
                                                color: predictionResult.prediction === 0 ? '#2e7d32' : predictionResult.prediction === 1 ? '#ef6c00' : '#c62828',
                                                border: '2px solid',
                                                borderColor: predictionResult.prediction === 0 ? '#a5d6a7' : predictionResult.prediction === 1 ? '#ffcc80' : '#ef9a9a'
                                            }}>
                                                <Typography variant="h3" sx={{ fontWeight: '900', letterSpacing: 1 }}>
                                                    {predictionResult.label}
                                                </Typography>
                                            </Box>

                                            <Grid container spacing={4} sx={{ mt: 1 }}>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="h6" gutterBottom color="primary">Probability Breakdown</Typography>
                                                    <ProbabilityDonut probabilities={predictionResult.probabilities} />
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="h6" gutterBottom color="primary">Current PM2.5 Level</Typography>
                                                    <GaugeChart value={predictionResult.prediction === 0 ? 15 : predictionResult.prediction === 1 ? 35 : 75} />
                                                </Grid>
                                            </Grid>

                                            {predictionResult.trend && (
                                                <Box sx={{ mt: 4 }}>
                                                    <Typography variant="h6" gutterBottom color="primary">24-Hour Forecast</Typography>
                                                    <TrendLineChart data={predictionResult.trend} />
                                                </Box>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', color: '#90a4ae' }}>
                                            <VaccinesIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                                            <Typography variant="h6">
                                                Enter parameters to check recess safety.
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 'analytics' && (
                        <Box>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#0277bd', mb: 4 }}>
                                Model Analytics
                            </Typography>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={8}>
                                    <Paper sx={{ p: 4, borderRadius: 4, boxShadow: '0 8px 24px rgba(2, 136, 209, 0.1)' }}>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#0277bd' }}>
                                            Feature Importance
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            Which weather parameters influence the PM2.5 safety level the most.
                                        </Typography>
                                        {featureImportance && <FeatureBar data={featureImportance} />}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                </Box>
            </Box>
        </ThemeProvider>
    );
}