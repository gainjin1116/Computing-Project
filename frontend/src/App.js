import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Chip,
  Divider,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  Checkbox,
  FormControlLabel,
  MenuItem,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  Skeleton
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Tune as TuneIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  HealthAndSafety as HealthIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Download as DownloadIcon,
  Emergency as EmergencyIcon,
  Thermostat as TempIcon,
  WaterDrop as HumidityIcon,
  Air as WindIcon,
  Compress as PressureIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import axios from 'axios';

// D3 Chart Components (Strictly D3.js as required by Assignment 3)
import D3GaugeChart from './components/charts/D3GaugeChart';
import D3ProbabilityDonut from './components/charts/D3ProbabilityDonut';
import D3DiurnalTrend from './components/charts/D3DiurnalTrend';
import D3FeatureImportance from './components/charts/D3FeatureImportance';
import D3WeatherClusters from './components/charts/D3WeatherClusters';
import PredictForm from './components/PredictForm';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Initial baseline weather conditions (Luddenham Station, Sydney)
const INITIAL_WEATHER = {
  temp: 22.0,
  humidity: 62.0,
  wind_speed: 3.5,
  wind_dir: 45,
  rain: 0.0,
  pressure: 1016.0,
  hour: 10,
  day_of_week: 1,
  is_holiday: 0
};

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Check Conditions, 2: Forecast & Trends, 3: Model & Rigor, 4: School Protocols
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [featureImportances, setFeatureImportances] = useState(null);

  // Active prediction state
  const [currentWeather, setCurrentWeather] = useState({ ...INITIAL_WEATHER });
  const [predictionResult, setPredictionResult] = useState({
    prediction: 0,
    label: 'Safe',
    probabilities: [0.92, 0.06, 0.02],
    estimated_pm25: 12.4,
    is_fallback: false,
    override_applied: false
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // UI Dialog states
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', role: 'Teacher', email: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Checkbox list for teacher recess readiness checklist
  const [checklist, setChecklist] = useState({
    inhalers: true,
    firstAid: true,
    indoorBackup: false,
    notificationsSent: false
  });

  // Feedback Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Theme definition
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0'
          },
          secondary: {
            main: '#0284c7',
            light: '#38bdf8',
            dark: '#0369a1'
          },
          success: {
            main: '#2e7d32',
            light: '#4caf50',
            dark: '#1b5e20'
          },
          warning: {
            main: '#ed6c02',
            light: '#ff9800',
            dark: '#e65100'
          },
          error: {
            main: '#d32f2f',
            light: '#ef5350',
            dark: '#c62828'
          },
          background: {
            default: darkMode ? '#0b1320' : '#f8fafc',
            paper: darkMode ? '#131e32' : '#ffffff'
          },
          text: {
            primary: darkMode ? '#f1f5f9' : '#0f172a',
            secondary: darkMode ? '#94a3b8' : '#475569'
          }
        },
        typography: {
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          h4: { fontWeight: 800 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          subtitle1: { fontWeight: 600 }
        },
        shape: {
          borderRadius: 12
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 8
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 14,
                boxShadow: darkMode
                  ? '0 4px 20px 0 rgba(0,0,0,0.4)'
                  : '0 4px 20px 0 rgba(0,0,0,0.05)'
              }
            }
          }
        }
      }),
    [darkMode]
  );

  // Responsive device queries
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for automatic telemetry refresh polling
  const [lastTelemetryTime, setLastTelemetryTime] = useState(new Date().toLocaleTimeString());
  const isPollingRef = useRef(false);

  // Probe backend and establish periodic real-time telemetry polling (every 30 seconds)
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const rootRes = await axios.get(`${API_BASE_URL}/`, { timeout: 2500 });
        if (rootRes.status === 200 && isMounted) {
          setBackendOnline(true);
        }

        // Fetch latest telemetry for automatic Overview dashboard sync
        const telemetryRes = await axios.get(`${API_BASE_URL}/telemetry/latest`, { timeout: 3000 });
        if (isMounted && telemetryRes.status === 200 && telemetryRes.data) {
          const data = telemetryRes.data;
          setCurrentWeather({
            temp: data.temp,
            humidity: data.humidity,
            wind_speed: data.wind_speed,
            wind_dir: data.wind_dir,
            rain: data.rain,
            pressure: data.pressure,
            hour: data.hour,
            day_of_week: data.day_of_week,
            is_holiday: data.is_holiday
          });
          setPredictionResult(prev => ({
            ...prev,
            estimated_pm25: data.estimated_pm25,
            label: data.safety_tier,
            prediction: data.safety_tier === 'Safe' ? 0 : (data.safety_tier === 'Caution' ? 1 : 2)
          }));
          setLastTelemetryTime(new Date(data.timestamp).toLocaleTimeString());
        }

        // Fetch feature importances if not already loaded
        if (!featureImportances && isMounted) {
          const featRes = await axios.get(`${API_BASE_URL}/feature-importance`, { timeout: 2500 });
          if (featRes.data && isMounted) {
            setFeatureImportances(featRes.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          setBackendOnline(false);
          setLastTelemetryTime(new Date().toLocaleTimeString());
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 30000); // 30-second polling interval

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [featureImportances]);

  const showNotification = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handlePredictResult = (data) => {
    setPredictionResult(data);
    if (data.input_params) {
      setCurrentWeather(data.input_params);
    }
    showNotification(
      `Updated safety classification: ${data.label} (${data.estimated_pm25 || 12} µg/m³)`,
      data.prediction === 0 ? 'success' : data.prediction === 1 ? 'warning' : 'error'
    );
  };

  const handleExportBriefing = () => {
    const briefingText = `=== SWINBURNE COS30049 - RECESS SAFETY ADVISOR ===
Generated: ${new Date().toLocaleString()}
Monitoring Station: Luddenham (LUDD), Western Sydney
Project Team: Group 6 (Gain Jin, Kwan Kian Ann, Lee Zhao Shean, Lee Chee Cung)

[CURRENT ATMOSPHERIC STATUS]
- Safety Level: ${predictionResult.label.toUpperCase()}
- Particulate Matter (PM2.5): ${predictionResult.estimated_pm25} µg/m³
- Temperature: ${currentWeather.temp} °C
- Relative Humidity: ${currentWeather.humidity} %
- Wind Speed & Direction: ${currentWeather.wind_speed} m/s (${currentWeather.wind_dir}°)
- Barometric Pressure: ${currentWeather.pressure} hPa
- Rain: ${currentWeather.rain} mm
- Day / Hour: Hour ${currentWeather.hour}:00, DayOfWeek ${currentWeather.day_of_week} (Holiday: ${currentWeather.is_holiday ? 'Yes' : 'No'})

[MODEL CONFIDENCE]
- Safe: ${(predictionResult.probabilities[0] * 100).toFixed(1)}%
- Caution: ${(predictionResult.probabilities[1] * 100).toFixed(1)}%
- Unsafe: ${(predictionResult.probabilities[2] * 100).toFixed(1)}%
- Model Source: ${predictionResult.is_fallback ? 'Verified Local Simulation Engine' : 'FastAPI Live Machine Learning API'}
- Rule Override Applied: ${predictionResult.override_applied ? 'YES (Severe atmospheric conditions detected)' : 'NO'}

[OPERATIONAL RECESS DIRECTIVE]
${
  predictionResult.prediction === 0
    ? 'Air quality is within healthy limits. Normal outdoor recess, PE, and outdoor sporting activities are permitted for all students.'
    : predictionResult.prediction === 1
    ? 'Elevated fine particulate matter detected. Vulnerable students with asthma or respiratory conditions must remain indoors. Limit intense aerobic running for all students during PE.'
    : 'HAZARDOUS PM2.5 LEVELS DETECTED. Suspend all outdoor recess and physical education. Move all students into air-conditioned, filtered classrooms immediately.'
}

[DUTY TEACHER CHECKLIST]
- Asthmatic Student Inhalers Verified: ${checklist.inhalers ? 'YES' : 'NO'}
- Asthma First-Aid Kit on Playground: ${checklist.firstAid ? 'YES' : 'NO'}
- Indoor Contingency Room Allocated: ${checklist.indoorBackup ? 'YES' : 'NO'}
- Staff Notifications Dispatched: ${checklist.notificationsSent ? 'YES' : 'NO'}
==================================================`;

    const blob = new Blob([briefingText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Recess_Safety_Briefing_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportDialogOpen(false);
    showNotification('Recess safety briefing report downloaded successfully.', 'success');
  };

  // Connected real backend API submission for School Health Officer Form
  const handleContactSubmit = async (e) => {
    if (e) e.preventDefault();
    if (contactSubmitting) return;

    if (!contactForm.name || !contactForm.name.trim()) {
      showNotification('Please enter your full name.', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactForm.email || !emailRegex.test(contactForm.email.trim())) {
      showNotification('Please enter a valid school or personal email address.', 'warning');
      return;
    }

    setContactSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/contact`, contactForm, { timeout: 4000 });
      showNotification(response.data.message || 'Incident dispatch successfully recorded.', 'success');
      setContactForm({ name: '', role: 'Teacher', email: '', message: '' });
      setContactDialogOpen(false); // Only close on successful submission
    } catch (err) {
      console.warn('Backend contact dispatch submission error:', err);
      const detailMsg = err.response?.data?.detail || 'Failed to submit incident dispatch. Please check server connection.';
      showNotification(detailMsg, 'error');
      // Intentionally do NOT close dialog on error so user does not lose input
    } finally {
      setContactSubmitting(false);
    }
  };

  const navLabels = [
    { label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Check Conditions', icon: <TuneIcon fontSize="small" /> },
    { label: 'Forecast & Trends', icon: <TrendingUpIcon fontSize="small" /> },
    { label: 'Model & Rigor', icon: <PsychologyIcon fontSize="small" /> },
    { label: 'School Protocols', icon: <HealthIcon fontSize="small" /> }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>

      {/* Modern Sticky Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: darkMode ? 'rgba(19, 30, 50, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 1100
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 2.5, md: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: { xs: 58, sm: 66 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Brand Logo & Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ display: { xs: 'flex', md: 'none' }, p: { xs: 0.8, sm: 1 } }}
                aria-label="Open menu navigation"
              >
                <MenuIcon />
              </IconButton>
              <Box
                sx={{
                  width: { xs: 34, sm: 38 },
                  height: { xs: 34, sm: 38 },
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
                  flexShrink: 0
                }}
              >
                <HealthIcon fontSize={isMobile ? "small" : "medium"} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: 'text.primary',
                    letterSpacing: -0.3,
                    fontSize: { xs: '0.95rem', sm: '1.1rem', lg: '1.2rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  Recess Safety Advisor
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: { xs: 'none', xl: 'block' },
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  NSW Schools Air Quality · Luddenham Station
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: { xs: 'none', md: 'block', xl: 'none' },
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Luddenham Station
                </Typography>
              </Box>
            </Box>

            {/* Desktop Navigation Links - Fully visible, non-scrollable flex layout */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flex: 1, justifyContent: 'center', mx: { md: 1, lg: 2 } }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  minHeight: 64,
                  '& .MuiTabs-scroller': {
                    overflow: 'visible !important'
                  },
                  '& .MuiTabs-flexContainer': {
                    justifyContent: 'center',
                    gap: { md: 0.25, lg: 0.75 }
                  },
                  '& .MuiTab-root': {
                    minHeight: 64,
                    minWidth: 'auto',
                    px: { md: 1, lg: 1.5 },
                    py: 0.5,
                    fontSize: { md: '0.82rem', lg: '0.88rem' },
                    fontWeight: 600,
                    textTransform: 'none',
                    gap: 0.6,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    borderRadius: 2,
                    my: 0.5,
                    '&:hover': {
                      backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)')
                    },
                    '&.Mui-selected': {
                      fontWeight: 800,
                      color: 'primary.main'
                    }
                  }
                }}
              >
                {navLabels.map((item, idx) => (
                  <Tab key={idx} icon={item.icon} iconPosition="start" label={item.label} />
                ))}
              </Tabs>
            </Box>

            {/* Quick Action Badges & Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 }, flexShrink: 0 }}>
              {/* Backend Status Indicator */}
              <Tooltip title={backendOnline ? 'FastAPI Backend Online (Connected at http://127.0.0.1:8000)' : 'FastAPI Offline (Running in Verified Local Simulation Mode)'}>
                <Chip
                  size="small"
                  icon={<Box component="span" className={backendOnline ? "live-pulse-dot" : "fallback-dot"} sx={{ ml: 1, mr: -0.5 }} />}
                  label={backendOnline ? 'FastAPI Live' : 'Local Fallback'}
                  color={backendOnline ? 'success' : 'default'}
                  variant={backendOnline ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    display: { xs: 'none', sm: 'inline-flex' },
                    cursor: 'help'
                  }}
                />
              </Tooltip>

              {/* Mobile Quick Emergency Icon Button */}
              <Tooltip title="Emergency Asthma First Aid SOP">
                <IconButton
                  color="error"
                  onClick={() => setEmergencyDialogOpen(true)}
                  sx={{
                    display: { xs: 'flex', sm: 'none' },
                    border: 1,
                    borderColor: 'error.main',
                    p: 0.8,
                    backgroundColor: darkMode ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.08)'
                  }}
                  aria-label="Asthma Emergency Protocol"
                >
                  <EmergencyIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Tablet/Desktop Emergency Protocol Trigger */}
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<EmergencyIcon />}
                onClick={() => setEmergencyDialogOpen(true)}
                sx={{
                  fontWeight: 700,
                  display: { xs: 'none', sm: 'inline-flex' },
                  borderColor: 'error.main',
                  fontSize: '0.8rem',
                  py: 0.6,
                  px: 1.2,
                  '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.08)' }
                }}
              >
                Asthma SOP
              </Button>

              {/* Dark/Light Mode Toggle */}
              <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit" sx={{ p: { xs: 0.8, sm: 1 } }}>
                  {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Responsive Mobile Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 290, p: 2.5 }} role="presentation">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <HealthIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Recess Safety
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Luddenham Station
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Chip
              size="small"
              icon={<Box component="span" className={backendOnline ? "live-pulse-dot" : "fallback-dot"} sx={{ ml: 1, mr: -0.5 }} />}
              label={backendOnline ? 'FastAPI Backend Online' : 'Verified Local Fallback'}
              color={backendOnline ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.72rem', width: '100%', justifyContent: 'flex-start' }}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <List sx={{ p: 0 }}>
            {navLabels.map((item, idx) => (
              <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={activeTab === idx}
                  onClick={() => {
                    setActiveTab(idx);
                    setDrawerOpen(false);
                  }}
                  sx={{ borderRadius: 2, minHeight: 46 }}
                >
                  <ListItemIcon sx={{ color: activeTab === idx ? 'primary.main' : 'inherit', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: activeTab === idx ? 800 : 500,
                      color: activeTab === idx ? 'primary.main' : 'inherit',
                      fontSize: '0.92rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<EmergencyIcon />}
              onClick={() => {
                setDrawerOpen(false);
                setEmergencyDialogOpen(true);
              }}
              sx={{ borderColor: 'error.main', fontWeight: 700, minHeight: 42 }}
            >
              Asthma First Aid SOP
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                setDrawerOpen(false);
                setExportDialogOpen(true);
              }}
              sx={{ minHeight: 42 }}
            >
              Export Briefing Report
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Main Container */}
      <Container
        maxWidth="lg"
        component="main"
        sx={{
          py: { xs: 2.5, sm: 3.5, md: 4 },
          px: { xs: 1.5, sm: 3, md: 4 },
          pb: { xs: 10, md: 5 },
          flex: 1,
          minHeight: 'calc(100vh - 180px)'
        }}
      >

        {/* ============================================================== */}
        {/* VIEW 0: TODAY'S OVERVIEW / DASHBOARD                           */}
        {/* ============================================================== */}
        {activeTab === 0 && (
          <Box className="fade-in">
            {/* Top Primary Directive Card */}
            <Card
              className="hover-card"
              sx={{
                mb: 3,
                p: { xs: 2, sm: 3.5 },
                borderLeft: { xs: 6, sm: 8 },
                borderColor:
                  predictionResult.prediction === 0
                    ? 'success.main'
                    : predictionResult.prediction === 1
                    ? 'warning.main'
                    : 'error.main',
                backgroundColor: darkMode ? '#131e32' : '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Chip
                    label={predictionResult.label.toUpperCase()}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      px: 1,
                      backgroundColor:
                        predictionResult.prediction === 0
                          ? 'success.main'
                          : predictionResult.prediction === 1
                          ? 'warning.main'
                          : 'error.main',
                      color: '#fff'
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    PM2.5: {predictionResult.estimated_pm25} µg/m³
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Assessed for: Hour {currentWeather.hour}:00 · {currentWeather.is_holiday ? 'NSW Public Holiday' : 'Regular School Day'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline' } }}>•</Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.8,
                      backgroundColor: backendOnline ? 'rgba(46, 125, 50, 0.08)' : 'rgba(237, 108, 2, 0.08)',
                      px: 1,
                      py: 0.3,
                      borderRadius: 1
                    }}
                  >
                    <Box component="span" className={backendOnline ? "live-pulse-dot" : "fallback-dot"} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: backendOnline ? 'success.main' : 'warning.main'
                      }}
                    >
                      {backendOnline ? 'Live Telemetry Sync' : 'Local Simulation Sync'}: {lastTelemetryTime}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  mb: 1.5,
                  fontSize: { xs: '1.35rem', sm: '1.8rem', md: '2.1rem' },
                  color:
                    predictionResult.prediction === 0
                      ? 'success.main'
                      : predictionResult.prediction === 1
                      ? 'warning.main'
                      : 'error.main'
                }}
              >
                {predictionResult.prediction === 0
                  ? 'Recess is a GO for all students'
                  : predictionResult.prediction === 1
                  ? 'Caution: Asthmatic students remain indoors'
                  : 'UNSAFE: Move all recess & PE indoors'}
              </Typography>

              <Typography variant="body1" sx={{ color: 'text.primary', mb: 2.5, lineHeight: 1.65, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
                {predictionResult.prediction === 0
                  ? 'Air quality in the Luddenham corridor is optimal. Fine particulate matter (PM2.5) concentrations remain safely below NSW Health thresholds. Normal outdoor playtime, physical education, and athletic drills are authorized.'
                  : predictionResult.prediction === 1
                  ? 'Particulate matter is elevated due to moderate atmospheric stagnation. Children diagnosed with asthma or respiratory allergies must remain inside well-ventilated classrooms. Restrict high-intensity aerobic sprints for remaining classes.'
                  : 'Severe particulate matter accumulation detected. High risk of triggering severe pediatric asthma exacerbations. Immediately cancel all outdoor sporting events, lunch breaks, and playground duty. Ensure classroom HVAC filtration is operational.'}
              </Typography>

              {predictionResult.override_applied && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                  <strong>Child Safety Override Engaged:</strong> Due to extreme atmospheric conditions (high temp, low wind), our deterministic safety boundary overrode the raw statistical model to prioritize pediatric protection.
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  color={predictionResult.prediction === 0 ? 'success' : predictionResult.prediction === 1 ? 'warning' : 'error'}
                  onClick={() => setActiveTab(1)}
                  sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' }, minHeight: 42 }}
                >
                  Test Weather Conditions
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setEmergencyDialogOpen(true)}
                  startIcon={<EmergencyIcon />}
                  sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' }, minHeight: 42 }}
                >
                  Asthma Emergency SOP
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setExportDialogOpen(true)}
                  startIcon={<DownloadIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', width: { xs: '100%', sm: 'auto' }, minHeight: 42 }}
                >
                  Export Briefing Report
                </Button>
              </Box>
            </Card>

            {/* Responsive Two-Column CSS Grid for Monitoring Widgets */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
                alignItems: 'stretch',
                mb: 3
              }}
            >
              {/* ROW 1 - LEFT: PM2.5 Safety Dial Card */}
              <Box>
                <Card sx={{ height: '100%', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                      PM2.5 Radial Safety Dial
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Continuous fine particulate reading calibrated to Australian NEPM standards
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1.5 }}>
                    <D3GaugeChart value={predictionResult.estimated_pm25} maxVal={100} darkMode={darkMode} />
                  </Box>
                </Card>
              </Box>

              {/* ROW 1 - RIGHT: Teacher & Nurse Readiness Checklist Card */}
              <Box>
                <Card sx={{ height: '100%', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon color={checklist.inhalers && checklist.firstAid ? "success" : "warning"} />
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                        Recess Readiness Checklist
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${(checklist.inhalers ? 1 : 0) + (checklist.firstAid ? 1 : 0) + (checklist.indoorBackup ? 1 : 0) + (checklist.notificationsSent ? 1 : 0)}/4 Ready`}
                      color={checklist.inhalers && checklist.firstAid ? 'success' : 'warning'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.8 }}>
                    Critical items must be checked before a GO decision. Precautionary items prepare indoor backups.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, justifyContent: 'center' }}>
                    {/* Critical Item 1 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        px: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 0.8,
                        borderColor: checklist.inhalers ? 'success.light' : 'divider',
                        backgroundColor: checklist.inhalers ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : '#f0fdf4') : 'inherit'
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, flex: 1 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checklist.inhalers}
                            onChange={(e) => setChecklist({ ...checklist, inhalers: e.target.checked })}
                            color="success"
                          />
                        }
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>High-risk asthmatic students have reliever inhalers present</Typography>}
                      />
                      <Chip size="small" label="CRITICAL" color="success" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                    </Paper>

                    {/* Critical Item 2 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        px: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 0.8,
                        borderColor: checklist.firstAid ? 'success.light' : 'divider',
                        backgroundColor: checklist.firstAid ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : '#f0fdf4') : 'inherit'
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, flex: 1 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checklist.firstAid}
                            onChange={(e) => setChecklist({ ...checklist, firstAid: e.target.checked })}
                            color="success"
                          />
                        }
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>First Aid kit with spacer & reliever taken onto the oval</Typography>}
                      />
                      <Chip size="small" label="CRITICAL" color="success" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                    </Paper>

                    {/* Optional Item 3 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        px: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 0.8,
                        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.25)' : '#f8fafc'
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, flex: 1 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checklist.indoorBackup}
                            onChange={(e) => setChecklist({ ...checklist, indoorBackup: e.target.checked })}
                            color="primary"
                          />
                        }
                        label={<Typography variant="body2" sx={{ color: 'text.secondary' }}>Indoor multi-purpose hall / library on standby for relocation</Typography>}
                      />
                      <Chip size="small" label="OPTIONAL" color="default" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                    </Paper>

                    {/* Optional Item 4 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        px: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 0.8,
                        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.25)' : '#f8fafc'
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, flex: 1 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checklist.notificationsSent}
                            onChange={(e) => setChecklist({ ...checklist, notificationsSent: e.target.checked })}
                            color="primary"
                          />
                        }
                        label={<Typography variant="body2" sx={{ color: 'text.secondary' }}>Recess air safety briefing broadcast to teaching staff & PE</Typography>}
                      />
                      <Chip size="small" label="OPTIONAL" color="default" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                    </Paper>
                  </Box>
                </Card>
              </Box>
            </Box>

            {/* Responsive Two-Column CSS Grid for Row 2 Telemetry & Guidelines */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
              {/* ROW 2 - LEFT: Environmental Monitoring Parameters Card */}
              <Box>
                <Card sx={{ height: '100%', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                      Environmental Telemetry Parameters
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Real-time atmospheric sensors at Luddenham station driving the classification model
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' }, gap: { xs: 1.2, sm: 1.5 }, flex: 1 }}>
                    {[
                      {
                        title: 'Temperature',
                        val: `${currentWeather.temp} °C`,
                        icon: <TempIcon color="error" />,
                        desc: 'Thermal sensor',
                        accent: '#ef4444',
                        bgLight: '#fff5f5',
                        bgDark: 'rgba(239, 68, 68, 0.08)'
                      },
                      {
                        title: 'Relative Humidity',
                        val: `${currentWeather.humidity} %`,
                        icon: <HumidityIcon color="primary" />,
                        desc: 'Moisture factor',
                        accent: '#0284c7',
                        bgLight: '#f0f9ff',
                        bgDark: 'rgba(2, 132, 199, 0.08)'
                      },
                      {
                        title: 'Wind Speed & Dir',
                        val: `${currentWeather.wind_speed} m/s`,
                        icon: <WindIcon color="info" />,
                        desc: `Heading ${currentWeather.wind_dir}°`,
                        accent: '#14b8a6',
                        bgLight: '#f0fdfa',
                        bgDark: 'rgba(20, 184, 166, 0.08)'
                      },
                      {
                        title: 'Barometric Pressure',
                        val: `${currentWeather.pressure} hPa`,
                        icon: <PressureIcon color="warning" />,
                        desc: 'Atmospheric stability',
                        accent: '#f59e0b',
                        bgLight: '#fffbeb',
                        bgDark: 'rgba(245, 158, 11, 0.08)'
                      }
                    ].map((metric, i) => (
                      <Paper
                        key={i}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.2, sm: 1.8 },
                          height: '100%',
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderLeft: `3px solid ${metric.accent}`,
                          backgroundColor: darkMode ? metric.bgDark : metric.bgLight,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            {metric.title}
                          </Typography>
                          {metric.icon}
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
                          {metric.val}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          {metric.desc}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Card>
              </Box>

              {/* ROW 2 - RIGHT: NSW Health Recess Activity Guidelines Card */}
              <Box>
                <Card sx={{ height: '100%', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                      NSW Health Recess Activity Guidelines
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Operational guidance matched to fine particulate matter concentration tiers
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, justifyContent: 'space-between' }}>
                    <Paper variant="outlined" sx={{ p: 1.6, borderLeft: 5, borderColor: 'success.main', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                        Safe Tier (0 to 25 µg/m³ PM2.5)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: '0.88rem' }}>
                        Unrestricted outdoor playtime. All classes, physical education, and competitive athletic drills may proceed outdoors as scheduled.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.6, borderLeft: 5, borderColor: 'warning.main', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main' }}>
                        Caution Tier (25 to 50 µg/m³ PM2.5)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: '0.88rem' }}>
                        Asthma action plan activation. Vulnerable children remain indoors in filtered rooms. Non-asthmatic students limit intense aerobic running.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.6, borderLeft: 5, borderColor: 'error.main', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main' }}>
                        Unsafe Tier (&gt; 50 µg/m³ PM2.5)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: '0.88rem' }}>
                        Complete outdoor recess shutdown. All students and staff remain inside sealed, air-filtered facilities until alerts clear.
                      </Typography>
                    </Paper>
                  </Box>
                </Card>
              </Box>
            </Box>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: CHECK CONDITIONS / SCENARIO SIMULATOR                  */}
        {/* ============================================================== */}
        {activeTab === 1 && (
          <Box className="fade-in">
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.1rem' } }}>
                Atmospheric Condition Simulator
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Input meteorological parameters or select quick-fill presets to predict recess air safety for any hour of the day.
              </Typography>
            </Box>

            {/* Form Full-Width */}
            <Card sx={{ p: { xs: 2, sm: 3.5 }, mb: 3.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                Environmental Input Parameters
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Parameters mapped directly to the NSW SWAQ station sensors and Public Holiday calendar records.
              </Typography>

              <PredictForm
                onPredict={handlePredictResult}
                onBackendStatusChange={(status) => setBackendOnline(status)}
                onLoadingChange={setIsCalculating}
              />
            </Card>

            {/* Balanced Two-Column Grid for Simulator Results */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                Simulation Prediction & Operational Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                Calculated air safety classification, confidence breakdown, and actionable school directives.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
                alignItems: 'stretch'
              }}
            >
              {/* Left Column: Safe Banner & D3 Probability Donut */}
              <Card sx={{ height: '100%', p: { xs: 2, sm: 3.5 }, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                {isCalculating ? (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Skeleton variant="text" width={220} height={20} sx={{ mx: 'auto', mb: 1.5 }} animation="wave" />
                    {/* A. Predicted Level Banner Skeleton */}
                    <Skeleton variant="rounded" width="100%" height={105} sx={{ borderRadius: 3, mb: 2.5 }} animation="wave" />
                    <Skeleton variant="text" width={180} height={28} sx={{ mx: 'auto', mb: 0.5 }} animation="wave" />
                    <Skeleton variant="text" width={260} height={18} sx={{ mx: 'auto', mb: 2 }} animation="wave" />
                    {/* B. Confidence Donut Skeleton */}
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                      <Skeleton variant="circular" width={200} height={200} animation="wave" />
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      PREDICTED RECESS SAFETY LEVEL
                    </Typography>

                    <Box
                      sx={{
                        py: { xs: 2, sm: 2.5 },
                        px: { xs: 2, sm: 3 },
                        borderRadius: 3,
                        mb: 2.5,
                        backgroundColor:
                          predictionResult.prediction === 0
                            ? 'success.main'
                            : predictionResult.prediction === 1
                            ? 'warning.main'
                            : 'error.main',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -0.5, fontSize: { xs: '1.8rem', sm: '2.5rem' } }}>
                        {predictionResult.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.95 }}>
                        Estimated PM2.5: {predictionResult.estimated_pm25} µg/m³
                      </Typography>
                    </Box>

                    {/* D3 Probability Donut Chart */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                      AI Model Prediction Confidence
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      Probability distribution across Safe, Caution, and Unsafe tiers
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <D3ProbabilityDonut
                        probabilities={predictionResult.probabilities}
                        darkMode={darkMode}
                      />
                    </Box>

                    {predictionResult.override_applied && (
                      <Alert severity="warning" sx={{ mt: 2, textAlign: 'left', borderRadius: 2 }}>
                        <strong>Deterministic Safety Rule Triggered:</strong> Stagnant heatwave conditions detected (Temp &gt; 30°C, RH &gt; 70%, Wind &lt; 3 m/s). Child safety is prioritized.
                      </Alert>
                    )}
                  </>
                )}
              </Card>

              {/* Right Column: Actionable School Directive */}
              <Card sx={{ height: '100%', p: { xs: 2, sm: 3.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {isCalculating ? (
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <Box>
                      <Skeleton variant="text" width={240} height={32} sx={{ mb: 0.5 }} animation="wave" />
                      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} animation="wave" />
                      {/* C. Safety Directive Card Skeleton */}
                      <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 2.5, mb: 2.5 }} animation="wave" />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Skeleton variant="rounded" width="100%" height={75} sx={{ borderRadius: 2 }} animation="wave" />
                        <Skeleton variant="rounded" width="100%" height={75} sx={{ borderRadius: 2 }} animation="wave" />
                      </Box>
                    </Box>
                    <Skeleton variant="rounded" width="100%" height={46} sx={{ borderRadius: 2, mt: 3 }} animation="wave" />
                  </Box>
                ) : (
                  <>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                        Actionable School Directive
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        Operational advice for PE & playtime based on simulated atmospheric conditions
                      </Typography>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 1.8, sm: 2.5 },
                          borderRadius: 2.5,
                          mb: 2.5,
                          borderLeft: 6,
                          borderColor:
                            predictionResult.prediction === 0
                              ? 'success.main'
                              : predictionResult.prediction === 1
                              ? 'warning.main'
                              : 'error.main',
                          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.3)' : '#f8fafc'
                        }}
                      >
                        <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.65, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
                          {predictionResult.prediction === 0
                            ? 'Optimal outdoor conditions. Normal recess, physical education, and outdoor sports permitted for all students without restriction.'
                            : predictionResult.prediction === 1
                            ? 'Elevated caution advised. Asthmatic and medically vulnerable students should stay indoors in air-conditioned rooms. Non-asthmatic students must limit intense aerobic workouts.'
                            : 'Hazardous air quality. Suspend outdoor recess. Move all students and classes into indoor air-conditioned facilities immediately.'}
                        </Typography>
                      </Paper>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            School Nurse Protocol:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: '0.88rem' }}>
                            {predictionResult.prediction === 0
                              ? 'Standard playground supervision. Keep first aid kit accessible.'
                              : predictionResult.prediction === 1
                              ? 'Conduct proactive inhaler check for registered asthmatic pupils.'
                              : 'Prepare emergency nebulizers and notify administration of activity shutdown.'}
                          </Typography>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Facility Guidelines:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: '0.88rem' }}>
                            Ensure classroom HEPA filters and HVAC air-exchange are set to indoor recirculation.
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      startIcon={<DownloadIcon />}
                      onClick={() => setExportDialogOpen(true)}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', mt: 3, py: 1.2 }}
                    >
                      Export Simulation Briefing
                    </Button>
                  </>
                )}
              </Card>
            </Box>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FORECAST & TRENDS                                      */}
        {/* ============================================================== */}
        {activeTab === 2 && (
          <Box className="fade-in">
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.1rem' } }}>
                Air Quality Forecast & Trend Analysis
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Explore 24-hour diurnal cyclical variations and unsupervised K-Means atmospheric weather clustering (k=3).
              </Typography>
            </Box>

            <Card sx={{ p: { xs: 2, sm: 3.5 }, mb: 3.5 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                  24-Hour Diurnal Particulate Matter Curve (PM2.5)
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Visualizes diurnal accumulation caused by early morning commuter rush hours and photochemical solar heating. Shaded band highlights primary school recess and lunch (10:30 - 13:30).
                </Typography>
              </Box>

              <D3DiurnalTrend activeParams={currentWeather} darkMode={darkMode} />
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
              {/* K-Means Clustering Explorer */}
              <Box>
                <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Unsupervised Weather Clusters (K-Means k=3)
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Validates atmospheric profiles in Sydney (Silhouette score 0.265) without target leakage.
                  </Typography>
                  <D3WeatherClusters darkMode={darkMode} />
                </Card>
              </Box>

              {/* Weekly Comparison & Traffic Patterns */}
              <Box>
                <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Weekday vs Weekend Pollution Cycle
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                    Anthropogenic emissions decline significantly during weekends and NSW Public Holidays.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { day: 'Monday - Wednesday', val: '14.2 µg/m³', tag: 'Peak Commuter Traffic', color: 'info' },
                      { day: 'Thursday - Friday', val: '15.8 µg/m³', tag: 'High Commercial Transit', color: 'info' },
                      { day: 'Saturday - Sunday', val: '9.4 µg/m³', tag: '35% Traffic Reduction', color: 'success' },
                      { day: 'NSW Public Holidays', val: '8.1 µg/m³', tag: 'School Bus & Heavy Fleet Suspended', color: 'success' }
                    ].map((item, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.8, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {item.day}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            {item.val}
                          </Typography>
                        </Box>
                        <Chip size="small" label={item.tag} color={item.color} variant="outlined" sx={{ fontSize: '0.72rem' }} />
                      </Paper>
                    ))}
                  </Box>
                </Card>
              </Box>
            </Box>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: MODEL & SCIENTIFIC RIGOR                               */}
        {/* ============================================================== */}
        {activeTab === 3 && (
          <Box className="fade-in">
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.1rem' } }}>
                Model Architecture & Scientific Rigor
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Complete documentation of Machine Learning workflows, feature engineering, and the Accuracy Paradox resolution.
              </Typography>
            </Box>

            {/* Critical Analysis: The Accuracy Paradox */}
            <Alert
              severity="warning"
              icon={<WarningIcon fontSize="inherit" />}
              sx={{ mb: 4, borderRadius: 3, p: { xs: 1.5, sm: 2 } }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                Critical Analysis: Resolving the "Accuracy Paradox" in Child Health Decisions
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: { xs: '0.86rem', sm: '0.92rem' } }}>
                In Assignment 2, our 100-tree Random Forest scored <strong>98.9% overall accuracy</strong>. However, rigorous confusion matrix scrutiny revealed a near-zero recall for the "Unsafe" class. Because hazardous pollution days represent &lt;1% of Sydney's historical data, a naive model achieves 99% accuracy by predicting "Safe" 100% of the time—a catastrophic failure mode for an asthmatic child. To fix this, our pipeline deploys <code>class_weight='balanced'</code> penalty scaling in Scikit-Learn alongside a deterministic safety override for severe weather inversions.
              </Typography>
            </Alert>

            {/* Full-Width Feature Importance Chart */}
            <Card sx={{ p: { xs: 2, sm: 3.5 }, mb: 3.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                Random Forest Gini Feature Importances (D3.js)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Relative Humidity (29.8%) and Temperature (20.5%) dominate classification, confirming atmospheric boundary layer inversion theory.
              </Typography>
              <D3FeatureImportance data={featureImportances} darkMode={darkMode} />
            </Card>

            {/* Balanced Two-Column Grid: Scorecard on Left, Dual-Platform Architecture on Right */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
              {/* Left Column: Algorithmic Benchmark Scorecard */}
              <Box>
                <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Algorithmic Benchmark Scorecard
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                    Empirical comparison across the 3 machine learning algorithms evaluated.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, justifyContent: 'space-between' }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        1. Multiple Linear Regression (Baseline)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.4 }}>
                        R² = 0.123, MAE = 2.36
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, display: 'block' }}>
                        Outcome: Fails to capture non-linear atmospheric turbulence; proves necessity of ensemble trees.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        2. Random Forest Classifier (Operational Core)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.4 }}>
                        Accuracy: 98.9%, 100 Estimators, Balanced Class Weights
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, display: 'block' }}>
                        Outcome: Accurately classifies multi-variable inversion interactions.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        3. K-Means Clustering (Unsupervised Profiling)
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.4 }}>
                        k = 3, Silhouette Score: 0.265
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block' }}>
                        Outcome: Successfully segments Stagnant Inversion vs Maritime Dispersal profiles.
                      </Typography>
                    </Paper>
                  </Box>
                </Card>
              </Box>

              {/* Right Column: Dual-Platform Engineering Architecture */}
              <Box>
                <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Dual-Platform Architecture (Python + KNIME)
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                    Ensures end-to-end data lineage transparency and reproducible model validation.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, justifyContent: 'space-between' }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                        Phase 1: Ingestion & Relational Merging
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.88rem' }}>
                        20-minute interval readings from Luddenham station merged via a Left Outer Join with the official NSW Public Holidays (2019–2023) calendar, achieving zero data loss.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                        Phase 2: KNN Imputation & Leakage Prevention
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.88rem' }}>
                        Applied 5-Nearest Neighbors (k-NN, k=5) spatial imputation to preserve multidimensional variance. Explicitly dropped continuous PM2.5 prior to classification to prevent leakage.
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                        Phase 3: Full-Stack FastAPI & D3.js Deployment
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.88rem' }}>
                        Serialized scaler.pkl and rf_model.pkl loaded in FastAPI backend with Pydantic validation, consumed asynchronously by this responsive React frontend with D3.js visualization.
                      </Typography>
                    </Paper>
                  </Box>
                </Card>
              </Box>
            </Box>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: SCHOOL PROTOCOLS & ASTHMA SOP                          */}
        {/* ============================================================== */}
        {activeTab === 4 && (
          <Box className="fade-in">
            {/* Page Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.1rem' } }}>
                School Health & Asthma Emergency SOP
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Operational guidelines compliant with Asthma Australia and the NSW Department of Education Student Health Policy.
              </Typography>
            </Box>

            {/* Top Quick Emergency Action Banner (Full Width) */}
            <Card
              sx={{
                p: { xs: 2, sm: 3 },
                mb: 3,
                borderLeft: 8,
                borderColor: 'error.main',
                backgroundColor: darkMode ? '#131e32' : '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      size="small"
                      icon={<EmergencyIcon fontSize="small" />}
                      label="IMMEDIATE ACTION REQUIRED"
                      color="error"
                      sx={{ fontWeight: 800, fontSize: '0.75rem', px: 0.5 }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Playground First Aid Protocol
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
                    4x4 Asthma First Aid Rule: Sit Upright, 4 Puffs, 4 Minutes
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                    Never leave an asthmatic student unattended during a respiratory attack. Administer blue reliever through a spacer immediately.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="contained"
                    color="error"
                    className="emergency-action"
                    onClick={() => setEmergencyDialogOpen(true)}
                    startIcon={<EmergencyIcon />}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 2.5, width: { xs: '100%', sm: 'auto' }, minHeight: 42 }}
                  >
                    Open Emergency SOP Modal
                  </Button>
                  <Button
                    component="a"
                    href="tel:000"
                    variant="outlined"
                    color="error"
                    startIcon={<PhoneIcon />}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 2, width: { xs: '100%', sm: 'auto' }, minHeight: 42 }}
                  >
                    Call 000 Ambulance
                  </Button>
                </Box>
              </Box>
            </Card>

            {/* ROW 1: Symmetrical Two-Column CSS Grid (First Aid Protocol vs PE Directives) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
                alignItems: 'stretch',
                mb: 3
              }}
            >
              {/* Left Column: 4-Step Asthma First Aid Protocol */}
              <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        backgroundColor: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0
                      }}
                    >
                      <EmergencyIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                        4-Step Asthma First Aid Protocol
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Asthma Australia Standard Procedure for Schools
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 2 }}>
                    {[
                      { step: 'Step 1', title: 'Sit the child upright', text: 'Be calm and reassuring. Do not leave the child alone. Loosen tight clothing around their neck and chest.' },
                      { step: 'Step 2', title: 'Give 4 separate puffs of blue/grey reliever', text: 'Shake the inhaler canister. Insert 1 puff into spacer. Take 4 breaths from spacer. Repeat until 4 puffs are completed.' },
                      { step: 'Step 3', title: 'Wait 4 minutes', text: 'If there is no breathing improvement, give 4 more separate puffs as in Step 2. Keep the child seated quietly.' },
                      { step: 'Step 4', title: 'If no improvement, Call 000 immediately', text: 'Dial 000 for an emergency ambulance. Continue administering 4 separate puffs every 4 minutes until paramedics arrive.' }
                    ].map((s, idx) => (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                          borderLeft: 4,
                          borderColor: 'error.main',
                          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.3)' : '#ffffff'
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.9rem' }}>
                          {s.step}: {s.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, fontSize: '0.86rem', lineHeight: 1.5 }}>
                          {s.text}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<EmergencyIcon />}
                  onClick={() => setEmergencyDialogOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700, mt: 1, py: 1 }}
                >
                  View Full-Screen Emergency SOP
                </Button>
              </Card>

              {/* Right Column: Playground Duty & PE Activity Directives */}
              <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0
                      }}
                    >
                      <HealthIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                        Playground Duty & PE Directives
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        NSW Department of Education Activity Guidance
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 2 }}>
                    {[
                      {
                        badge: 'SUPERVISION',
                        color: 'primary',
                        title: 'Pre-Recess Asthmatic Student Verification',
                        text: 'Duty teachers verify that students on the Asthma Register have their reliever puffers and spacers readily accessible before entering the oval.'
                      },
                      {
                        badge: 'CAUTION TIER',
                        color: 'warning',
                        title: 'Exercise Modification (PM2.5: 25–50 µg/m³)',
                        text: 'Restrict intense cardiovascular endurance drills (beep tests, interval sprints). Transition students to low-intensity technical skills drills.'
                      },
                      {
                        badge: 'UNSAFE TIER',
                        color: 'error',
                        title: 'Indoor Facility Relocation (PM2.5 > 50 µg/m³)',
                        text: 'Immediately suspend outdoor playtime and sports. Escort students into air-conditioned, filtered indoor gymnasiums or the school library.'
                      },
                      {
                        badge: 'FACILITY',
                        color: 'info',
                        title: 'Classroom Air Recirculation Management',
                        text: 'Ensure all external windows and doors remain closed during inversion events. Verify HVAC systems operate in indoor recirculation mode.'
                      }
                    ].map((d, idx) => (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                          borderLeft: 4,
                          borderColor: `${d.color}.main`,
                          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.3)' : '#ffffff'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                            {d.title}
                          </Typography>
                          <Chip size="small" label={d.badge} color={d.color} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.86rem', lineHeight: 1.5 }}>
                          {d.text}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportDialogOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700, mt: 1, py: 1 }}
                >
                  Export Duty Teacher Protocol
                </Button>
              </Card>
            </Box>

            {/* ROW 2: Symmetrical Two-Column CSS Grid (Hotline Directory vs Health Officer Form) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
                alignItems: 'stretch'
              }}
            >
              {/* Left Column: Emergency Hotline Directory */}
              <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Emergency Hotline Directory (Tap to Call)
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Direct phone lines for immediate emergency dispatch, medical advice, and toxic exposure support.
                  </Typography>

                  <List dense sx={{ p: 0 }}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        component="a"
                        href="tel:000"
                        sx={{
                          borderRadius: 2,
                          px: 2,
                          py: 1.2,
                          backgroundColor: darkMode ? 'rgba(211,47,47,0.12)' : '#ffebee',
                          border: 1,
                          borderColor: 'error.main'
                        }}
                      >
                        <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
                          <PhoneIcon fontSize="medium" />
                        </ListItemIcon>
                        <ListItemText
                          primary="000 — Emergency Services (Ambulance / Police)"
                          secondary="Tap to call immediately for severe asthma attacks or respiratory failure."
                          primaryTypographyProps={{ fontWeight: 800, color: 'error.main', fontSize: '0.92rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                        />
                      </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        component="a"
                        href="tel:131126"
                        sx={{
                          borderRadius: 2,
                          px: 2,
                          py: 1.2,
                          border: 1,
                          borderColor: 'divider',
                          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.3)' : '#f8fafc'
                        }}
                      >
                        <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                          <PhoneIcon fontSize="medium" />
                        </ListItemIcon>
                        <ListItemText
                          primary="13 11 26 — NSW Poisons Information Centre"
                          secondary="24/7 specialist medical advice on hazardous smoke and particulate inhalation."
                          primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                        />
                      </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        component="a"
                        href="tel:1800278462"
                        sx={{
                          borderRadius: 2,
                          px: 2,
                          py: 1.2,
                          border: 1,
                          borderColor: 'divider',
                          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.3)' : '#f8fafc'
                        }}
                      >
                        <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                          <PhoneIcon fontSize="medium" />
                        </ListItemIcon>
                        <ListItemText
                          primary="1800 ASTHMA (1800 278 462) — Asthma Australia"
                          secondary="Free helpline for school asthma management guidelines and clinical support."
                          primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </Box>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 1, backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.2)' : '#f1f5f9' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                    Internal School Intercom: Dial Extension <strong>402</strong> for the Front Office & Nurse Station.
                  </Typography>
                </Paper>
              </Card>

              {/* Right Column: Contact School Health Officer */}
              <Card sx={{ p: { xs: 2, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                    Notify School Health & Safety Officer
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Direct dispatch system to notify the on-duty school nurse or PE department regarding air quality symptoms.
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                        ON-DUTY NURSE
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                        Station Clinic (Bldg B)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Available 8:00–16:00
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                        HVAC AIR FILTERS
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        HEPA Active (Recirc)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Classrooms 101–124
                      </Typography>
                    </Paper>
                  </Box>

                  <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, mb: 2.5, borderLeft: 4, borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      When to submit an incident dispatch:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.86rem', lineHeight: 1.5 }}>
                      • A student reports shortness of breath or persistent coughing during recess.<br />
                      • Visible hazard reduction burn smoke is observed drifting across the oval.<br />
                      • First aid kit replacement or spacer replenishment is required.
                    </Typography>
                  </Paper>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  className="primary-action"
                  onClick={() => setContactDialogOpen(true)}
                  sx={{ minHeight: 46, borderRadius: 2, fontWeight: 700, py: 1.2 }}
                >
                  Open Health Contact & Incident Form
                </Button>
              </Card>
            </Box>
          </Box>
        )}
      </Container>

      {/* ================================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR                                     */}
      {/* ================================================================ */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          display: { xs: 'block', md: 'none' },
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: darkMode ? 'rgba(19, 30, 50, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          showLabels
          sx={{
            backgroundColor: 'transparent',
            height: 62,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              px: 0.5,
              py: 0.5,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700
              }
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.68rem',
              '&.Mui-selected': {
                fontSize: '0.72rem',
                fontWeight: 800
              }
            }
          }}
        >
          <BottomNavigationAction label="Overview" icon={<DashboardIcon fontSize="small" />} />
          <BottomNavigationAction label="Simulator" icon={<TuneIcon fontSize="small" />} />
          <BottomNavigationAction label="Trends" icon={<TrendingUpIcon fontSize="small" />} />
          <BottomNavigationAction label="Model" icon={<PsychologyIcon fontSize="small" />} />
          <BottomNavigationAction label="SOP" icon={<HealthIcon fontSize="small" />} />
        </BottomNavigation>
      </Paper>

      {/* ================================================================ */}
      {/* PROFESSIONAL FOOTER                                              */}
      {/* ================================================================ */}
      <Box
        component="footer"
        sx={{
          py: 4,
          pb: { xs: 10, md: 4 },
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: darkMode ? '#070d17' : '#f1f5f9'
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ maxWidth: { xs: '100%', md: '65%' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                COS30049 Computing Technology Innovation Project · Assignment 3
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Swinburne University of Technology · Group 6: Gain Jin, Kwan Kian Ann, Lee Zhao Shean, Lee Chee Cung
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Meteorological data sourced from NSW Government SWAQ and Australian Public Holidays (data.gov.au).
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" color="inherit" onClick={() => setContactDialogOpen(true)}>
                Support & Contact
              </Button>
              <Button size="small" color="inherit" onClick={() => setExportDialogOpen(true)}>
                Briefing Generator
              </Button>
              <Button size="small" color="inherit" onClick={() => setActiveTab(3)}>
                Algorithm Specs
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ================================================================ */}
      {/* DIALOG 1: ASTHMA EMERGENCY SOP (Responsive on All Devices)       */}
      {/* ================================================================ */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmergencyIcon /> Asthma First Aid Emergency Protocol
          </Box>
          {isMobile && (
            <IconButton onClick={() => setEmergencyDialogOpen(false)} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
            If a student demonstrates difficulty breathing, coughing, wheezing, or chest tightness:
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <strong>1. Sit student upright:</strong> Keep them calm. Do NOT leave them alone.
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <strong>2. Give 4 puffs of blue reliever:</strong> Use a spacer. Shake inhaler, 1 puff into spacer, 4 breaths. Repeat 4 times.
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <strong>3. Wait 4 minutes:</strong> If no improvement, administer 4 more puffs.
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: 'error.main', backgroundColor: darkMode ? 'rgba(211,47,47,0.1)' : '#ffebee' }}>
              <strong>4. If still no improvement: CALL 000 IMMEDIATELY.</strong> Keep administering 4 puffs every 4 minutes until ambulance arrives.
            </Paper>

            <Button
              component="a"
              href="tel:000"
              variant="contained"
              color="error"
              size="large"
              className="emergency-action"
              startIcon={<PhoneIcon />}
              sx={{ fontWeight: 800, py: 1.2, mt: 1, borderRadius: 2 }}
            >
              Call 000 (Emergency Ambulance)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Button onClick={() => setEmergencyDialogOpen(false)} variant="outlined" color="inherit">
            Acknowledge & Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================ */}
      {/* DIALOG 2: EXPORT SAFETY BRIEFING REPORT (Responsive)             */}
      {/* ================================================================ */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Export Daily Recess Safety Briefing</span>
          {isMobile && (
            <IconButton onClick={() => setExportDialogOpen(false)} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2 }}>
            This summary briefing is formatted for distribution to morning duty teachers, physical education coordinators, and front-office health administrators.
          </DialogContentText>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
              backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
              maxHeight: 280,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap'
            }}
          >
{`[RECESS SAFETY ADVISOR - DAILY SUMMARY BRIEFING]
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
Station: Luddenham (LUDD), Western Sydney
Classified Safety Level: ${predictionResult.label.toUpperCase()}
Fine Particulate Matter (PM2.5): ${predictionResult.estimated_pm25} µg/m³
Temperature: ${currentWeather.temp} °C | Humidity: ${currentWeather.humidity} %
Wind Speed: ${currentWeather.wind_speed} m/s | Pressure: ${currentWeather.pressure} hPa

Directive: ${
  predictionResult.prediction === 0
    ? 'SAFE: Normal outdoor recess and sports allowed.'
    : predictionResult.prediction === 1
    ? 'CAUTION: Asthmatic children remain inside. Limit intense running.'
    : 'UNSAFE: Suspend all outdoor activities. Move classes indoors.'
}

Model Architecture: Random Forest (100 Estimators) + K-NN Imputation (k=5)`}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Button onClick={() => setExportDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleExportBriefing} variant="contained" color="primary" startIcon={<DownloadIcon />}>
            Download Report (.txt)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================ */}
      {/* DIALOG 3: CONTACT HEALTH OFFICER / NURSE (Responsive)            */}
      {/* ================================================================ */}
      <Dialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Contact School Health & Safety Officer</span>
          {isMobile && (
            <IconButton onClick={() => setContactDialogOpen(false)} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2 }}>
            Submit an environmental question or report localized smoke/haze near the school grounds.
          </DialogContentText>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Your Full Name"
              required
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Your School Role"
              value={contactForm.role}
              onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
            >
              <MenuItem value="Teacher">Classroom Teacher</MenuItem>
              <MenuItem value="PE Coordinator">Physical Education Coordinator</MenuItem>
              <MenuItem value="School Nurse">School Nurse / First Aid Officer</MenuItem>
              <MenuItem value="Administrator">Principal / Administrator</MenuItem>
              <MenuItem value="Parent">Parent / Guardian</MenuItem>
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Email Address"
              type="email"
              required
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              rows={3}
              label="Details / Observations"
              placeholder="e.g. Visible hazard reduction smoke detected near northern oval..."
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Button onClick={() => setContactDialogOpen(false)} color="inherit" disabled={contactSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleContactSubmit}
            variant="contained"
            color="primary"
            className="primary-action"
            disabled={contactSubmitting}
            startIcon={contactSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {contactSubmitting ? 'Sending...' : 'Submit Message'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 7, md: 0 } }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
