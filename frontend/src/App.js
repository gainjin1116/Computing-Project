import React, { useState, useEffect } from 'react';
import {
    Box, CssBaseline, Drawer, AppBar, Toolbar, Typography,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    ThemeProvider, createTheme, Grid, Paper, Card, CardContent
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';

import PredictForm from './components/PredictForm';
import ProbabilityDonut from './components/charts/ProbabilityDonut';
import FeatureBar from './components/charts/FeatureBar';

const drawerWidth = 240;

const theme = createTheme({
    palette: { mode: 'light', primary: { main: '#1976d2' }, background: { default: '#f4f6f8' } },
});

export default function App() {
    const [activeTab, setActiveTab] = useState('predict');
    const [predictionResult, setPredictionResult] = useState(null);
    const [featureImportance, setFeatureImportance] = useState(null);

    // Fetch static feature importance data on load
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/feature-importance')
            .then(res => setFeatureImportance(res.data))
            .catch(err => console.error("Error fetching features:", err));
    }, []);

    const handlePrediction = (data) => {
        setPredictionResult(data);
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex' }}>
                <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                    <Toolbar>
                        <WarningIcon sx={{ mr: 2 }} />
                        <Typography variant="h6" noWrap component="div">
                            Recess Safety Advisor
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}>
                    <Toolbar />
                    <Box sx={{ overflow: 'auto' }}>
                        <List>
                            <ListItem disablePadding>
                                <ListItemButton selected={activeTab === 'predict'} onClick={() => setActiveTab('predict')}>
                                    <ListItemIcon><DashboardIcon /></ListItemIcon>
                                    <ListItemText primary="Prediction" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton selected={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
                                    <ListItemIcon><AnalyticsIcon /></ListItemIcon>
                                    <ListItemText primary="Analytics" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Box>
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>

                    {activeTab === 'predict' && (
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h5" gutterBottom>Input Parameters</Typography>
                                    <PredictForm onPredict={handlePrediction} />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3, minHeight: '400px' }}>
                                    <Typography variant="h5" gutterBottom>Prediction Result</Typography>
                                    {predictionResult ? (
                                        <Box sx={{ textAlign: 'center', mt: 4 }}>
                                            <Typography variant="h3" sx={{
                                                color: predictionResult.prediction === 0 ? 'success.main' : predictionResult.prediction === 1 ? 'warning.main' : 'error.main',
                                                fontWeight: 'bold', mb: 2
                                            }}>
                                                {predictionResult.label}
                                            </Typography>
                                            <ProbabilityDonut probabilities={predictionResult.probabilities} />
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
                                            Submit the form to see the prediction results.
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 'analytics' && (
                        <Box>
                            <Typography variant="h4" gutterBottom>Model Analytics</Typography>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" gutterBottom>Feature Importance</Typography>
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