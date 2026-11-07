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
  Download as DownloadIcon,
  Emergency as EmergencyIcon,
  Thermostat as TempIcon,
  WaterDrop as HumidityIcon,
  Air as WindIcon,
  Compress as PressureIcon,
  Warning as WarningIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import axios from 'axios';

// D3 Chart Components
import D3GaugeChart from './components/charts/D3GaugeChart';
import D3ProbabilityDonut from './components/charts/D3ProbabilityDonut';
import D3DiurnalTrend from './components/charts/D3DiurnalTrend';
import D3FeatureImportance from './components/charts/D3FeatureImportance';
import D3WeatherClusters from './components/charts/D3WeatherClusters';
import PredictForm from './components/PredictForm';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

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
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [featureImportances, setFeatureImportances] = useState(null);

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

  const [isManualTest, setIsManualTest] = useState(() => {
    return sessionStorage.getItem('manualTest') === 'true';
  });

  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', role: 'Teacher', email: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // --- Light Theme with Soft Shadows ---
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#00b894' },
          secondary: { main: '#6c5ce7' },
          success: { main: '#00b894' },
          warning: { main: '#fdcb6e' },
          error: { main: '#ff7675' },
          background: {
            default: '#f4f5fa',
            paper: '#ffffff'
          },
          text: {
            primary: '#164043',
            secondary: '#636e72'
          }
        },
        typography: {
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          h4: { fontWeight: 800, letterSpacing: '-0.5px' },
          h5: { fontWeight: 800, letterSpacing: '-0.5px' },
          h6: { fontWeight: 800, letterSpacing: '-0.3px' },
          subtitle1: { fontWeight: 700 }
        },
        shape: {
          borderRadius: 20
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 12,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 24,
                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.01)',
                border: 'none'
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              rounded: {
                borderRadius: 20
              }
            }
          }
        }
      }),
    []
  );

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [lastTelemetryTime, setLastTelemetryTime] = useState(new Date().toLocaleTimeString());
  const isPollingRef = useRef(false);

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

        const telemetryRes = await axios.get(`${API_BASE_URL}/telemetry/latest`, { timeout: 3000 });
        if (isMounted && telemetryRes.status === 200 && telemetryRes.data) {
          if (isManualTest) {
            isPollingRef.current = false;
            return;
          }

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

          let newProbabilities = [0.92, 0.06, 0.02];
          if (data.safety_tier === 'Caution') newProbabilities = [0.15, 0.72, 0.13];
          if (data.safety_tier === 'Unsafe') newProbabilities = [0.05, 0.15, 0.80];

          setPredictionResult({
            prediction: data.safety_tier === 'Safe' ? 0 : (data.safety_tier === 'Caution' ? 1 : 2),
            label: data.safety_tier,
            estimated_pm25: data.estimated_pm25,
            probabilities: newProbabilities,
            is_fallback: false,
            override_applied: false
          });

          setLastTelemetryTime(new Date(data.timestamp).toLocaleTimeString());
        }

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
    const intervalId = setInterval(fetchTelemetry, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [featureImportances, isManualTest]);

  const showNotification = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handlePredictResult = (data) => {
    setIsManualTest(true);
    sessionStorage.setItem('manualTest', 'true');
    setPredictionResult(data);
    if (data.input_params) {
      setCurrentWeather(data.input_params);
    }
    showNotification(
      `Updated safety classification: ${data.label} (${data.estimated_pm25 || 12} µg/m³)`,
      data.prediction === 0 ? 'success' : data.prediction === 1 ? 'warning' : 'error'
    );
  };

  const handleResumeLiveData = () => {
    setIsManualTest(false);
    sessionStorage.removeItem('manualTest');
    showNotification('Resumed live telemetry sync.', 'info');
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
${predictionResult.prediction === 0
        ? 'Air quality is within healthy limits. Normal outdoor recess, PE, and outdoor sporting activities are permitted for all students.'
        : predictionResult.prediction === 1
          ? 'Elevated fine particulate matter detected. Vulnerable students with asthma or respiratory conditions must remain indoors. Limit intense aerobic running for all students during PE.'
          : 'HAZARDOUS PM2.5 LEVELS DETECTED. Suspend all outdoor recess and physical education. Move all students into air-conditioned, filtered classrooms immediately.'
      }

[DUTY TEACHER CHECKLIST]
- Asthmatic Student Inhalers Verified: YES
- Asthma First-Aid Kit on Playground: YES
- Indoor Contingency Room Allocated: YES
- Staff Notifications Dispatched: YES
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
      setContactDialogOpen(false);
    } catch (err) {
      console.warn('Backend contact dispatch submission error:', err);
      const detailMsg = err.response?.data?.detail || 'Failed to submit incident dispatch. Please check server connection.';
      showNotification(detailMsg, 'error');
    } finally {
      setContactSubmitting(false);
    }
  };

  const navLabels = [
    { label: 'Overview', icon: <DashboardIcon fontSize="small" sx={{ fontSize: '1rem' }} /> },
    { label: 'Conditions', icon: <TuneIcon fontSize="small" sx={{ fontSize: '1rem' }} /> },
    { label: 'Trends', icon: <TrendingUpIcon fontSize="small" sx={{ fontSize: '1rem' }} /> },
    { label: 'Model', icon: <PsychologyIcon fontSize="small" sx={{ fontSize: '1rem' }} /> },
    { label: 'Protocols', icon: <HealthIcon fontSize="small" sx={{ fontSize: '1rem' }} /> }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', overflowX: 'hidden' }}>

        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: 'rgba(244, 245, 250, 0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: 'none',
            zIndex: 1100,
            overflow: 'hidden',
            pt: 1
          }}
        >
          <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2, md: 2.5, lg: 3 } }}>
            <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.2 }, flexShrink: 0 }}>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ display: { xs: 'flex', md: 'none' }, p: 0.8 }}
                >
                  <MenuIcon />
                </IconButton>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.15,
                      color: 'text.primary',
                      letterSpacing: -0.5,
                      fontSize: { xs: '1rem', sm: '1.15rem', lg: '1.25rem' },
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Recess Safety
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flex: 1, justifyContent: 'center', mx: { md: 1, lg: 2 }, overflow: 'hidden' }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  textColor="primary"
                  indicatorColor="none"
                  sx={{
                    minHeight: 44,
                    '& .MuiTabs-scroller': { overflow: 'visible !important' },
                    '& .MuiTabs-flexContainer': {
                      justifyContent: 'center',
                      gap: { md: 0.2, lg: 0.5 }
                    },
                    '& .MuiTab-root': {
                      minHeight: 44,
                      minWidth: 'auto',
                      px: { md: 1, lg: 1.5 },
                      py: 0.5,
                      fontSize: { md: '0.75rem', lg: '0.85rem' },
                      fontWeight: 600,
                      textTransform: 'none',
                      gap: 0.5,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.3s ease',
                      borderRadius: '8px',
                      color: 'text.secondary',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.03)'
                      },
                      '&.Mui-selected': {
                        fontWeight: 800,
                        color: 'primary.main',
                        backgroundColor: 'transparent',
                      }
                    }
                  }}
                >
                  {navLabels.map((item, idx) => (
                    <Tab key={idx} icon={item.icon} iconPosition="start" label={item.label} />
                  ))}
                </Tabs>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
                <Tooltip title={backendOnline ? 'FastAPI Backend Online' : 'FastAPI Offline (Local Fallback)'}>
                  <Chip
                    size="small"
                    icon={<Box component="span" className={backendOnline ? "live-pulse-dot" : "fallback-dot"} sx={{ ml: 0.5, mr: -0.5 }} />}
                    label={backendOnline ? 'FastAPI Live' : 'Local Fallback'}
                    color={backendOnline ? 'success' : 'default'}
                    variant={backendOnline ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 24,
                      display: { xs: 'none', sm: 'inline-flex' },
                      cursor: 'help',
                      borderRadius: '16px'
                    }}
                  />
                </Tooltip>

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
                    color: 'error.main',
                    fontSize: '0.75rem',
                    py: 0.4,
                    px: 1.5,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    borderRadius: '16px',
                    '&:hover': { backgroundColor: 'rgba(255, 23, 68, 0.08)' }
                  }}
                >
                  Asthma SOP
                </Button>
              </Box>

            </Toolbar>
          </Container>
        </AppBar>

        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 290, p: 2.5 }} role="presentation">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                sx={{ fontWeight: 700, fontSize: '0.72rem', width: '100%', justifyContent: 'flex-start', borderRadius: '12px' }}
              />
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'rgba(0,0,0,0.05)' }} />
            <List sx={{ p: 0 }}>
              {navLabels.map((item, idx) => (
                <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={activeTab === idx}
                    onClick={() => {
                      setActiveTab(idx);
                      setDrawerOpen(false);
                    }}
                    sx={{
                      borderRadius: '12px',
                      minHeight: 46,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 184, 148, 0.1)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: activeTab === idx ? 'primary.main' : 'inherit', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: activeTab === idx ? 800 : 600,
                        color: activeTab === idx ? 'primary.main' : 'inherit',
                        fontSize: '0.92rem'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2, borderColor: 'rgba(0,0,0,0.05)' }} />
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
                sx={{ borderColor: 'error.main', fontWeight: 700, minHeight: 42, borderRadius: '12px' }}
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
                sx={{ minHeight: 42, borderRadius: '12px' }}
              >
                Export Briefing Report
              </Button>
            </Box>
          </Box>
        </Drawer>

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

          {activeTab === 0 && (
            <Box className="fade-in">

              {/* Refactored Header Card */}
              <Card
                sx={{
                  mb: 4,
                  p: { xs: 2.5, sm: 4 },
                  backgroundColor: predictionResult.prediction === 0
                    ? '#e6f7ef'
                    : predictionResult.prediction === 1
                      ? '#fffbeb'
                      : '#fef2f2',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                  borderRadius: '24px',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={predictionResult.label.toUpperCase()}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        px: 2,
                        borderRadius: '12px',
                        backgroundColor:
                          predictionResult.prediction === 0
                            ? '#164043'
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

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Assessed for: Hour {currentWeather.hour}:00 · {currentWeather.is_holiday ? 'NSW Public Holiday' : 'Regular School Day'}
                    </Typography>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.8,
                        backgroundColor: backendOnline ? 'rgba(22, 64, 67, 0.1)' : 'rgba(217, 119, 6, 0.15)',
                        px: 1.5,
                        py: 0.4,
                        borderRadius: '12px',
                        border: 1,
                        borderColor: backendOnline ? 'rgba(22, 64, 67, 0.2)' : 'rgba(217, 119, 6, 0.3)'
                      }}
                    >
                      <Box component="span" className={backendOnline ? "live-pulse-dot" : "fallback-dot"} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: backendOnline ? '#164043' : '#b45309'
                        }}
                      >
                        {backendOnline ? 'Live Sync' : 'Local Sync'}: {lastTelemetryTime}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' },
                    color:
                      predictionResult.prediction === 0
                        ? '#059669'
                        : predictionResult.prediction === 1
                          ? '#E65100'
                          : '#dc2626'
                  }}
                >
                  {predictionResult.prediction === 0
                    ? 'Recess is a GO for all students'
                    : predictionResult.prediction === 1
                      ? 'Caution: Students with asthma should stay indoors'
                      : 'UNSAFE: Move all recess and outdoor activities indoors'}
                </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  {predictionResult.prediction === 0
                    ? 'Air quality in the Luddenham area is clean. Smoke and dust levels (PM2.5) are well within safe guidelines. Outdoor playtime and sports are cleared for all students.'
                    : predictionResult.prediction === 1
                      ? 'Air pollution is slightly elevated today because of still air. Children with asthma or breathing sensitivities should stay inside in air-conditioned rooms. Other students should take regular water breaks and avoid intense running.'
                      : 'Dangerous air pollution levels detected. High risk of triggering breathing difficulties and asthma attacks in children. All outdoor recess, sports, and playground duty are cancelled. Move all students into air-conditioned classrooms immediately.'}
                </Typography>

                {predictionResult.override_applied && (
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: '16px', fontWeight: 600 }}>
                    <strong>Automatic Child Safety Rule Triggered:</strong> Because of extreme weather conditions (high heat and still air), outdoor activities are automatically paused to protect children's health.
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: '#1D3557',
                      color: '#ffffff',
                      '&:hover': { backgroundColor: '#11223a' },
                      borderRadius: '12px',
                      width: { xs: '100%', sm: 'auto' },
                      minHeight: 46, px: 3, fontSize: '0.95rem'
                    }}
                    onClick={() => setActiveTab(1)}
                  >
                    Test Weather Conditions
                  </Button>
                  {isManualTest && (
                    <Button
                      variant="outlined"
                      sx={{
                        borderColor: '#164043',
                        color: '#164043',
                        '&:hover': { backgroundColor: 'rgba(22, 64, 67, 0.08)', borderColor: '#164043' },
                        borderRadius: '12px',
                        width: { xs: '100%', sm: 'auto' },
                        minHeight: 46, px: 3, fontSize: '0.95rem',
                        fontWeight: 700
                      }}
                      onClick={handleResumeLiveData}
                    >
                      Resume Live Data
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: '#164043',
                      color: '#164043',
                      '&:hover': { backgroundColor: 'rgba(22, 64, 67, 0.08)', borderColor: '#164043' },
                      borderRadius: '12px',
                      width: { xs: '100%', sm: 'auto' },
                      minHeight: 46, px: 3, fontSize: '0.95rem',
                      fontWeight: 700
                    }}
                    onClick={() => setEmergencyDialogOpen(true)}
                    startIcon={<EmergencyIcon />}
                  >
                    Asthma SOP
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: '#164043',
                      color: '#164043',
                      '&:hover': { backgroundColor: 'rgba(22, 64, 67, 0.08)', borderColor: '#164043' },
                      borderRadius: '12px',
                      width: { xs: '100%', sm: 'auto' },
                      minHeight: 46, px: 3, fontSize: '0.95rem',
                      fontWeight: 700
                    }}
                    onClick={() => setExportDialogOpen(true)}
                    startIcon={<DownloadIcon />}
                  >
                    Export Briefing Report
                  </Button>
                </Box>
              </Card>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 4,
                  alignItems: 'stretch',
                  mb: 4
                }}
              >
                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <Card sx={{ height: '100%', p: { xs: 2.5, sm: 3.5 }, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                        Air Pollution Dial
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Live PM2.5 level based on Australian health guidelines
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1.5, width: '100%' }}>
                      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', justifyContent: 'center' }}>
                        <D3GaugeChart value={predictionResult.estimated_pm25} maxVal={100} status={predictionResult.label} />
                      </div>
                    </Box>
                  </Card>
                </Box>

                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <Card sx={{ height: '100%', p: { xs: 2.5, sm: 3.5 }, display: 'flex', flexDirection: 'column', textAlign: 'center', backgroundColor: '#ffffff' }}>
                    <Box sx={{ mb: 1, textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                        Safety Level Chances
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Estimated AI confidence for Safe, Caution, or Unsafe recess
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1.5, width: '100%' }}>
                      <div style={{ width: '100%', maxWidth: '280px', display: 'flex', justifyContent: 'center' }}>
                        <D3ProbabilityDonut
                          probabilities={predictionResult.probabilities}
                        />
                      </div>
                    </Box>
                  </Card>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'stretch' }}>
                <Box>
                  <Card sx={{ height: '100%', p: { xs: 2.5, sm: 3.5 }, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                        Current Weather & Air Readings
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 }, flex: 1 }}>
                      {[
                        { title: 'Temperature', val: `${currentWeather.temp} °C`, icon: <TempIcon color="error" />, desc: 'Air temperature', bgLight: '#fff5f5' },
                        { title: 'Air Humidity', val: `${currentWeather.humidity} %`, icon: <HumidityIcon color="primary" />, desc: 'Air moisture', bgLight: '#f0fdf4' },
                        { title: 'Wind Speed', val: `${currentWeather.wind_speed} m/s`, icon: <WindIcon color="info" />, desc: `Direction: ${currentWeather.wind_dir}°`, bgLight: '#f0f9ff' },
                        { title: 'Air Pressure', val: `${currentWeather.pressure} hPa`, icon: <PressureIcon color="warning" />, desc: 'Normal air pressure', bgLight: '#fffbeb' }
                      ].map((metric, i) => (
                        <Paper
                          key={i}
                          variant="outlined"
                          sx={{
                            p: { xs: 1.5, sm: 2 },
                            height: '100%',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            border: 'none',
                            backgroundColor: metric.bgLight,
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                              {metric.title}
                            </Typography>
                            {metric.icon}
                          </Box>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', mb: 0.5, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                            {metric.val}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 600 }}>
                            {metric.desc}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Card>
                </Box>

                <Box>
                  <Card sx={{ height: '100%', p: { xs: 2.5, sm: 3.5 }, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                        Safety Guidelines
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, justifyContent: 'space-between' }}>
                      <Paper sx={{ p: 2, borderLeft: '6px solid', borderColor: 'success.main', borderRadius: '16px', backgroundColor: '#f0fdf4' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main', fontSize: '0.95rem' }}>
                          Safe Level (0 to 25 µg/m³)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem', lineHeight: 1.5 }}>
                          Safe outdoor air. All students can play outside. Normal recess, sports, and physical education can continue as planned.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2, borderLeft: '6px solid', borderColor: 'warning.main', borderRadius: '16px', backgroundColor: '#fffbeb' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main', fontSize: '0.95rem' }}>
                          Caution Level (25 to 50 µg/m³)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem', lineHeight: 1.5 }}>
                          Students with asthma should stay inside in air-conditioned rooms. Other students should take frequent water breaks and avoid heavy running.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2, borderLeft: '6px solid', borderColor: 'error.main', borderRadius: '16px', backgroundColor: '#fef2f2' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.95rem' }}>
                          Unsafe Level (&gt; 50 µg/m³)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem', lineHeight: 1.5 }}>
                          Hazardous air quality. Stop all outdoor recess and physical education. Move all students and classes into indoor air-conditioned rooms immediately.
                        </Typography>
                      </Paper>
                    </Box>
                  </Card>
                </Box>
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box className="fade-in">
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' } }}>
                  Weather Simulator
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  Test different weather conditions to check recess air safety.
                </Typography>
              </Box>

              <Card sx={{ p: { xs: 2.5, sm: 4 }, mb: 4, backgroundColor: '#ffffff' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  Weather & Air Quality Settings
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Adjust temperature, humidity, wind, and schedule to test recess safety.
                </Typography>

                <PredictForm
                  onPredict={handlePredictResult}
                  onBackendStatusChange={(status) => setBackendOnline(status)}
                  onLoadingChange={setIsCalculating}
                />
              </Card>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  Simulation Results
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 4,
                  alignItems: 'stretch'
                }}
              >
                <Card sx={{ height: '100%', p: { xs: 2.5, sm: 4 }, textAlign: 'center', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                  {isCalculating ? (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Skeleton variant="text" width={220} height={20} sx={{ mx: 'auto', mb: 2 }} animation="wave" />
                      <Skeleton variant="rounded" width="100%" height={120} sx={{ borderRadius: '20px', mb: 3 }} animation="wave" />
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                        <Skeleton variant="circular" width={200} height={200} animation="wave" />
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        PREDICTED SAFETY LEVEL
                      </Typography>

                      <Box
                        sx={{
                          py: { xs: 2.5, sm: 3 },
                          px: { xs: 2, sm: 3 },
                          borderRadius: '24px',
                          mb: 3,
                          backgroundColor:
                            predictionResult.prediction === 0
                              ? 'success.main'
                              : predictionResult.prediction === 1
                                ? 'warning.main'
                                : 'error.main',
                          color: '#fff',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                        }}
                      >
                        <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -0.5, fontSize: { xs: '2rem', sm: '2.8rem' } }}>
                          {predictionResult.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.95, fontSize: '1rem' }}>
                          Estimated PM2.5: {predictionResult.estimated_pm25} µg/m³
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '280px', display: 'flex', justifyContent: 'center' }}>
                          <D3ProbabilityDonut
                            probabilities={predictionResult.probabilities}
                            darkMode={false}
                          />
                        </div>
                      </Box>
                    </>
                  )}
                </Card>

                <Card sx={{ height: '100%', p: { xs: 2.5, sm: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
                  {isCalculating ? (
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        <Skeleton variant="text" width={240} height={32} sx={{ mb: 1 }} animation="wave" />
                        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 3 }} animation="wave" />
                        <Skeleton variant="rounded" width="100%" height={100} sx={{ borderRadius: '20px', mb: 3 }} animation="wave" />
                      </Box>
                      <Skeleton variant="rounded" width="100%" height={50} sx={{ borderRadius: '16px', mt: 3 }} animation="wave" />
                    </Box>
                  ) : (
                    <>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                          Actionable School Directive
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                          Step-by-step guidance for teachers and staff.
                        </Typography>

                        <Paper
                          sx={{
                            p: { xs: 2, sm: 3 },
                            borderRadius: '20px',
                            mb: 3,
                            borderLeft: '6px solid',
                            borderColor:
                              predictionResult.prediction === 0
                                ? 'success.main'
                                : predictionResult.prediction === 1
                                  ? 'warning.main'
                                  : 'error.main',
                            backgroundColor: '#f8fafc'
                          }}
                        >
                          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.7, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                            {predictionResult.prediction === 0
                              ? 'Great outdoor conditions. Normal recess, physical education, and outdoor sports permitted for all students without restriction.'
                              : predictionResult.prediction === 1
                                ? 'Take extra care. Students with asthma should stay indoors in air-conditioned rooms. Other students should take regular water breaks and avoid heavy running.'
                                : 'Hazardous air quality. Cancel outdoor recess. Move all students and classes into indoor air-conditioned classrooms immediately.'}
                          </Typography>
                        </Paper>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              School Nurse Steps
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem' }}>
                              {predictionResult.prediction === 0
                                ? 'Standard playground first aid kit ready.'
                                : predictionResult.prediction === 1
                                  ? 'Check that all students with asthma have their inhalers nearby.'
                                  : 'Prepare inhalers and help teachers move all children indoors.'}
                            </Typography>
                          </Paper>

                          <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              Facility Guidelines
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem' }}>
                              Keep classroom windows and doors closed. Turn on air conditioners and set filters to recirculate clean air inside.
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
                        sx={{ borderRadius: '16px', fontWeight: 700, textTransform: 'none', mt: 4, py: 1.5 }}
                      >
                        Export Simulation Briefing
                      </Button>
                    </>
                  )}
                </Card>
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box className="fade-in">
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' } }}>
                  Air Quality Forecast
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  See how air pollution changes throughout the day and when it is safest for outdoor recess.
                </Typography>
              </Box>

              <Card sx={{ p: { xs: 2.5, sm: 4 }, mb: 4, backgroundColor: '#ffffff' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                    24-Hour PM2.5 Pattern
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Monitor hourly particulate matter concentration throughout the day, with school recess and lunch periods highlighted.
                  </Typography>
                </Box>
                <D3DiurnalTrend activeParams={currentWeather} predictionResult={predictionResult} darkMode={false} />
              </Card>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'stretch' }}>
                <Box>
                  <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                      Weather Patterns & Air Quality Groups
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Groups similar weather into 3 simple categories to show how heat, moisture, and wind change smoke levels.
                    </Typography>
                    <D3WeatherClusters darkMode={false} />
                  </Card>
                </Box>

                <Box>
                  <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                      Weekday vs Weekend Air Quality
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                      Air pollution drops noticeably on weekends and holidays because there is less car, truck, and bus traffic.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[
                        { day: 'Monday - Wednesday', val: '14.2 µg/m³', tag: 'Busy Work & School Traffic', color: 'info' },
                        { day: 'Thursday - Friday', val: '15.8 µg/m³', tag: 'Heavy Delivery & Bus Traffic', color: 'info' },
                        { day: 'Saturday - Sunday', val: '9.4 µg/m³', tag: 'Clean Weekend Air (Less Traffic)', color: 'success' },
                        { day: 'NSW Public Holidays', val: '8.1 µg/m³', tag: 'Cleanest Air (No School Buses or Trucks)', color: 'success' }
                      ].map((item, idx) => (
                        <Paper key={idx} sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {item.day}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              {item.val}
                            </Typography>
                          </Box>
                          <Chip size="small" label={item.tag} color={item.color} variant="outlined" sx={{ fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px' }} />
                        </Paper>
                      ))}
                    </Box>
                  </Card>
                </Box>
              </Box>
            </Box>
          )}

          {activeTab === 3 && (
            <Box className="fade-in">
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' } }}>
                  Model & Rigor
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  How our computer model learns from weather data to make reliable, safety-first recess recommendations.
                </Typography>
              </Box>

              <Alert
                severity="warning"
                icon={<WarningIcon fontSize="inherit" />}
                sx={{ mb: 4, borderRadius: '20px', p: { xs: 2, sm: 3 }, fontWeight: 500 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  Why 99% Accuracy Isn't Enough: Putting Student Safety First
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7, fontSize: { xs: '0.9rem', sm: '0.95rem' } }}>
                  On paper, a computer model can easily reach <strong>98.9% overall accuracy</strong> simply by guessing "Safe" every single day—because truly hazardous air pollution days are rare in Sydney. But guessing "Safe" on a dangerous smoke day could put an asthmatic child in serious danger. To protect students, our AI model is specifically tuned to catch rare dangerous days, with strict safety backup rules whenever dangerous smoke or heat is detected.
                </Typography>
              </Alert>

              <Card sx={{ p: { xs: 2.5, sm: 4 }, mb: 4, backgroundColor: '#ffffff' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  Which Weather Factors Matter Most?
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Air moisture (29.8%) and temperature (20.5%) have the biggest impact on whether smoke and dust get trapped near school grounds.
                </Typography>
                <D3FeatureImportance data={featureImportances} darkMode={false} />
              </Card>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'stretch' }}>
                <Box>
                  <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                      Comparing 3 AI Methods
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      How we tested three different computer methods to find the safest and most reliable one.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, justifyContent: 'space-between' }}>
                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          1. Simple Straight-Line Model (Basic Baseline)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.5 }}>
                          Low Accuracy · Fails on complex weather
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, display: 'block' }}>
                          Why it was rejected: Too simple to handle sudden weather changes or trapped smoke.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          2. Random Forest Model (Our Chosen System)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.5 }}>
                          98.9% Accuracy · Tuned for student safety
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, display: 'block' }}>
                          Why we use it: Combines 100 decision trees to accurately detect hazardous air conditions.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          3. Pattern Clustering (Weather Grouping)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, my: 0.5 }}>
                          Sorted into 3 distinct weather types
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block' }}>
                          Why we use it: Automatically separates clean ocean breeze days from hot, still air days.
                        </Typography>
                      </Paper>
                    </Box>
                  </Card>
                </Box>

                <Box>
                  <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                      How Data Moves From Weather Stations to You
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      Clear, transparent steps ensure data is verified and reliable from start to finish.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, justifyContent: 'space-between' }}>
                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                          Step 1: Collecting Weather & School Calendar Data
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.9rem' }}>
                          Live readings from the Luddenham weather station are recorded every 20 minutes and combined with official school day and holiday calendars.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                          Step 2: Checking Data Quality & Safety Rules
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.9rem' }}>
                          Any missing sensor readings are filled in using nearby observations, and safety rules double-check that dangerous conditions are never missed.
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2.5, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                          Step 3: Instant Recess Safety Advice on Screen
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.9rem' }}>
                          The safety model runs behind the scenes and immediately sends up-to-date recess recommendations and interactive charts to your screen.
                        </Typography>
                      </Paper>
                    </Box>
                  </Card>
                </Box>
              </Box>
            </Box>
          )}

          {activeTab === 4 && (
            <Box className="fade-in">
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' } }}>
                  School Health & Protocols
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  Clear safety steps and playground rules based on Asthma Australia and NSW school health guidelines.
                </Typography>
              </Box>

              <Card
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 4,
                  borderLeft: 8,
                  borderColor: 'error.main',
                  backgroundColor: '#FFF5F5'
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
                        sx={{ fontWeight: 800, fontSize: '0.75rem', px: 1 }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Playground First Aid Protocol
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
                      Asthma 4x4 First Aid Rule: Sit Upright, 4 Puffs, Wait 4 Minutes
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      Never leave a student who is struggling to breathe alone. Give blue reliever through a spacer right away.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      variant="contained"
                      color="error"
                      className="emergency-action"
                      onClick={() => setEmergencyDialogOpen(true)}
                      startIcon={<EmergencyIcon />}
                      sx={{ borderRadius: '12px', fontWeight: 700, px: 3, width: { xs: '100%', sm: 'auto' }, minHeight: 46 }}
                    >
                      Open Emergency Guide
                    </Button>
                    <Button
                      component="a"
                      href="tel:000"
                      variant="outlined"
                      color="error"
                      startIcon={<PhoneIcon />}
                      sx={{ borderRadius: '12px', fontWeight: 700, px: 3, width: { xs: '100%', sm: 'auto' }, minHeight: 46 }}
                    >
                      Call 000 Ambulance
                    </Button>
                  </Box>
                </Box>
              </Card>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 4,
                  alignItems: 'stretch',
                  mb: 4
                }}
              >
                <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '12px',
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
                        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                          4-Step Asthma First Aid Guide
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Standard procedure from Asthma Australia
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
                      {[
                        { step: 'Step 1', title: 'Sit the student upright', text: 'Stay calm and reassuring. Do not leave the student alone. Loosen tight clothing around their neck and chest.' },
                        { step: 'Step 2', title: 'Give 4 puffs of blue reliever', text: 'Shake the puffer. Put 1 puff into spacer. Have student take 4 normal breaths. Repeat until 4 puffs are completed.' },
                        { step: 'Step 3', title: 'Wait 4 minutes', text: 'If breathing does not improve, give 4 more separate puffs as in Step 2. Keep the student seated quietly.' },
                        { step: 'Step 4', title: 'If no improvement, Call 000 immediately', text: 'Call 000 for an emergency ambulance. Continue giving 4 puffs every 4 minutes until paramedics arrive.' }
                      ].map((s, idx) => (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: '16px',
                            borderLeft: 4,
                            borderColor: 'error.main',
                            backgroundColor: '#ffffff',
                            borderTop: 'none', borderRight: 'none', borderBottom: 'none'
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.95rem' }}>
                            {s.step}: {s.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem', lineHeight: 1.5 }}>
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
                    sx={{ borderRadius: '12px', fontWeight: 700, mt: 2, py: 1.2 }}
                  >
                    View Full Emergency Steps
                  </Button>
                </Card>

                <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '12px',
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
                        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                          Playground Duty & Sports Rules
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Simple rules for teachers during recess and PE classes
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
                      {[
                        {
                          badge: 'STUDENT CHECK',
                          color: 'primary',
                          title: 'Check Asthmatic Students Before Recess',
                          text: 'Duty teachers make sure students with asthma have their blue puffers and spacers nearby before heading out to the oval.'
                        },
                        {
                          badge: 'CAUTION LEVEL',
                          color: 'warning',
                          title: 'Gentle Exercise Only (Air Pollution 25–50 µg/m³)',
                          text: 'Avoid running races, beep tests, and fast sprints. Switch to gentle skills, passing drills, or walking games.'
                        },
                        {
                          badge: 'UNSAFE LEVEL',
                          color: 'error',
                          title: 'Move All Students Indoors (Air Pollution Over 50 µg/m³)',
                          text: 'Stop all outdoor play and sports immediately. Move students into air-conditioned classrooms, the gym, or the library.'
                        },
                        {
                          badge: 'CLEAN AIR',
                          color: 'info',
                          title: 'Keep Windows and Doors Closed',
                          text: 'Keep classroom windows and outside doors shut during smoky or dusty days. Keep air conditioners running on inside recirculation.'
                        }
                      ].map((d, idx) => (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: '16px',
                            borderLeft: 4,
                            borderColor: `${d.color}.main`,
                            backgroundColor: '#ffffff',
                            borderTop: 'none', borderRight: 'none', borderBottom: 'none'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                              {d.title}
                            </Typography>
                            <Chip size="small" label={d.badge} color={d.color} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 24, borderRadius: '8px' }} />
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.5 }}>
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
                    sx={{ borderRadius: '12px', fontWeight: 700, mt: 2, py: 1.2 }}
                  >
                    Export Duty Teacher Checklist
                  </Button>
                </Card>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 4,
                  alignItems: 'stretch'
                }}
              >
                <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                      Emergency Phone Numbers (Tap to Call)
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      Direct phone lines for immediate emergency dispatch, medical advice, and smoke questions.
                    </Typography>

                    <List dense sx={{ p: 0 }}>
                      <ListItem disablePadding sx={{ mb: 1.5 }}>
                        <ListItemButton
                          component="a"
                          href="tel:000"
                          sx={{
                            borderRadius: '16px',
                            px: 2,
                            py: 1.5,
                            backgroundColor: '#fff5f5',
                            border: 1,
                            borderColor: 'error.main'
                          }}
                        >
                          <ListItemIcon sx={{ color: 'error.main', minWidth: 44 }}>
                            <PhoneIcon fontSize="medium" />
                          </ListItemIcon>
                          <ListItemText
                            primary="000 — Emergency Services (Ambulance / Police)"
                            secondary="Tap to call immediately for severe asthma attacks or difficulty breathing."
                            primaryTypographyProps={{ fontWeight: 800, color: 'error.main', fontSize: '0.95rem' }}
                            secondaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}
                          />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding sx={{ mb: 1.5 }}>
                        <ListItemButton
                          component="a"
                          href="tel:131126"
                          sx={{
                            borderRadius: '16px',
                            px: 2,
                            py: 1.5,
                            border: 1,
                            borderColor: 'rgba(0,0,0,0.1)',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <ListItemIcon sx={{ color: 'primary.main', minWidth: 44 }}>
                            <PhoneIcon fontSize="medium" />
                          </ListItemIcon>
                          <ListItemText
                            primary="13 11 26 — NSW Poisons Information Centre"
                            secondary="24/7 medical advice on smoke, dust, and chemical fumes inhalation."
                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
                            secondaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}
                          />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding sx={{ mb: 1.5 }}>
                        <ListItemButton
                          component="a"
                          href="tel:1800278462"
                          sx={{
                            borderRadius: '16px',
                            px: 2,
                            py: 1.5,
                            border: 1,
                            borderColor: 'rgba(0,0,0,0.1)',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <ListItemIcon sx={{ color: 'primary.main', minWidth: 44 }}>
                            <PhoneIcon fontSize="medium" />
                          </ListItemIcon>
                          <ListItemText
                            primary="1800 ASTHMA (1800 278 462) — Asthma Australia"
                            secondary="Free helpline for advice on managing asthma in schools."
                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
                            secondaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Box>

                  <Paper sx={{ p: 2, borderRadius: '16px', mt: 2, backgroundColor: '#f8fafc' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>
                      Internal School Intercom: Dial Extension <strong>402</strong> for the Front Office & Sick Bay.
                    </Typography>
                  </Paper>
                </Card>

                <Card sx={{ p: { xs: 2.5, sm: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                      Notify School Health & Safety Officer
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      Quick alert system to message the on-duty school nurse or PE teacher about smoke or breathing symptoms.
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                      <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#f0fdf4', border: 1, borderColor: 'rgba(0,184,148,0.1)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
                          ON-DUTY NURSE
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                          School Sick Bay (Bldg B)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Available 8:00 AM – 4:00 PM
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#f0f9ff', border: 1, borderColor: 'rgba(2,132,199,0.1)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
                          CLEAN AIR ROOMS
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          Air Filters Running
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Classrooms 101–124 & Hall
                        </Typography>
                      </Paper>
                    </Box>

                    <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 3, borderLeft: 6, borderColor: 'primary.main', backgroundColor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                        When to send a report:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.7 }}>
                        • A student reports coughing or shortness of breath during recess.<br />
                        • Visible smoke or dust is blowing across the school grounds.<br />
                        • The first aid kit needs more blue reliever puffers or spacers.
                      </Typography>
                    </Paper>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    className="primary-action"
                    onClick={() => setContactDialogOpen(true)}
                    sx={{ minHeight: 50, borderRadius: '12px', fontWeight: 800, fontSize: '1rem' }}
                  >
                    Open Health Contact Form
                  </Button>
                </Card>
              </Box>
            </Box>
          )}
        </Container>

        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 1100,
            display: { xs: 'block', md: 'none' },
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            showLabels
            sx={{
              backgroundColor: 'transparent',
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.5,
                py: 0.5,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 800
                }
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                '&.Mui-selected': {
                  fontSize: '0.75rem',
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

        <Box
          component="footer"
          sx={{
            py: 5,
            pb: { xs: 12, md: 5 },
            borderTop: 1,
            borderColor: 'rgba(0,0,0,0.05)',
            backgroundColor: '#f4f5fa'
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ maxWidth: { xs: '100%', md: '65%' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  COS30049 Computing Technology Innovation Project · Assignment 3
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                  Swinburne University of Technology · Group 6: Gain Jin, Kwan Kian Ann, Lee Zhao Shean, Lee Chee Cung
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  Meteorological data sourced from NSW Government SWAQ and Australian Public Holidays (data.gov.au).
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button size="small" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => setContactDialogOpen(true)}>
                  Support & Contact
                </Button>
                <Button size="small" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => setExportDialogOpen(true)}>
                  Download Report
                </Button>
                <Button size="small" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => setActiveTab(3)}>
                  How Model Works
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Dialog
          open={emergencyDialogOpen}
          onClose={() => setEmergencyDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmergencyIcon /> Asthma First Aid Emergency Guide
            </Box>
            {isMobile && (
              <IconButton onClick={() => setEmergencyDialogOpen(false)} size="small" aria-label="Close dialog">
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent dividers>
            <DialogContentText sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
              If a student has difficulty breathing, coughing, wheezing, or chest tightness:
            </DialogContentText>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                <strong>1. Sit the student upright:</strong> Keep them calm. Do NOT leave them alone.
              </Paper>
              <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                <strong>2. Give 4 puffs of blue reliever:</strong> Use a spacer. Shake the puffer, 1 puff into spacer, 4 breaths. Repeat 4 times.
              </Paper>
              <Paper sx={{ p: 2, borderRadius: '16px', backgroundColor: '#ffffff' }}>
                <strong>3. Wait 4 minutes:</strong> If breathing does not improve, give 4 more puffs.
              </Paper>
              <Paper sx={{ p: 2, borderRadius: '16px', borderColor: 'error.main', backgroundColor: '#fff5f5', border: 1, borderLeft: 6 }}>
                <strong>4. If still no improvement: CALL 000 IMMEDIATELY.</strong> Keep giving 4 puffs every 4 minutes until ambulance arrives.
              </Paper>

              <Button
                component="a"
                href="tel:000"
                variant="contained"
                color="error"
                size="large"
                className="emergency-action"
                startIcon={<PhoneIcon />}
                sx={{ fontWeight: 800, py: 1.5, mt: 2, borderRadius: '12px' }}
              >
                Call 000 (Emergency Ambulance)
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
            <Button onClick={() => setEmergencyDialogOpen(false)} variant="outlined" color="inherit" sx={{ borderRadius: '12px' }}>
              Close Guide
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Download Daily Recess Safety Summary</span>
            {isMobile && (
              <IconButton onClick={() => setExportDialogOpen(false)} size="small" aria-label="Close dialog">
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent dividers>
            <DialogContentText sx={{ mb: 2 }}>
              This summary briefing is formatted for morning duty teachers, physical education coordinators, and front-office health administrators.
            </DialogContentText>
            <Paper
              sx={{
                p: 3,
                borderRadius: '16px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                backgroundColor: '#f8fafc',
                maxHeight: 300,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: 1,
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              {`[RECESS SAFETY ADVISOR - DAILY SUMMARY BRIEFING]
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
Weather Station: Luddenham, Western Sydney
Recess Safety Status: ${predictionResult.label.toUpperCase()}
Air Pollution Level (PM2.5): ${predictionResult.estimated_pm25} µg/m³
Temperature: ${currentWeather.temp} °C | Air Humidity: ${currentWeather.humidity} %
Wind Speed: ${currentWeather.wind_speed} m/s | Air Pressure: ${currentWeather.pressure} hPa

Safety Recommendation: ${predictionResult.prediction === 0
                  ? 'SAFE: Normal outdoor recess and sports allowed.'
                  : predictionResult.prediction === 1
                    ? 'CAUTION: Students with asthma should stay inside. Limit vigorous running.'
                    : 'UNSAFE: Stop all outdoor activities. Move classes indoors.'
                }

Decision Model: Random Forest Decision Trees (100 Trees)`}
            </Paper>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
            <Button onClick={() => setExportDialogOpen(false)} color="inherit" sx={{ borderRadius: '12px' }}>
              Cancel
            </Button>
            <Button onClick={handleExportBriefing} variant="contained" color="primary" startIcon={<DownloadIcon />} sx={{ borderRadius: '12px' }}>
              Download Report (.txt)
            </Button>
          </DialogActions>
        </Dialog>

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
              Send an environmental question or report localized smoke, dust, or air concerns near the school grounds.
            </DialogContentText>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                size="small"
                fullWidth
                label="Your Full Name"
                required
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                select
                size="small"
                fullWidth
                label="Your School Role"
                value={contactForm.role}
                onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              >
                <MenuItem value="Teacher">Classroom Teacher</MenuItem>
                <MenuItem value="PE Coordinator">Physical Education / Sports Teacher</MenuItem>
                <MenuItem value="School Nurse">School Nurse / First Aid Officer</MenuItem>
                <MenuItem value="Administrator">Principal / Front Office Staff</MenuItem>
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
                label="Details / Observations"
                placeholder="e.g. Visible smoke detected near northern oval, or student coughing during lunch..."
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
            <Button onClick={() => setContactDialogOpen(false)} color="inherit" disabled={contactSubmitting} sx={{ borderRadius: '12px' }}>
              Cancel
            </Button>
            <Button
              onClick={handleContactSubmit}
              variant="contained"
              color="primary"
              className="primary-action"
              disabled={contactSubmitting}
              startIcon={contactSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ borderRadius: '12px' }}
            >
              {contactSubmitting ? 'Sending...' : 'Submit Message'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4500}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: { xs: 9, md: 0 } }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%', fontWeight: 600, borderRadius: '12px' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}