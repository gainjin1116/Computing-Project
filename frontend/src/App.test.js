import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('Recess Safety Advisor - Frontend Integration Tests', () => {
  test('renders Recess Safety Advisor title and main heading with telemetry sync', async () => {
    render(<App />);
    const titleElements = screen.getAllByText(/Recess Safety Advisor/i);
    expect(titleElements.length).toBeGreaterThan(0);

    const mainHeading = screen.getByText(/Recess is a GO/i);
    expect(mainHeading).toBeInTheDocument();

    // Verifies live or local telemetry synchronization badge is rendered
    expect(screen.getByText(/Sync:/i)).toBeInTheDocument();
  });

  test('renders navigation tabs and switches views', () => {
    render(<App />);
    const checkConditionsTab = screen.getByText('Check Conditions');
    expect(checkConditionsTab).toBeInTheDocument();

    fireEvent.click(checkConditionsTab);
    expect(screen.getByText(/Atmospheric Condition Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuous Meteorological Telemetry Sensors/i)).toBeInTheDocument();
  });

  test('validates accessible labels and spinbutton roles on numeric inputs', () => {
    render(<App />);
    // Switch to Check Conditions tab
    fireEvent.click(screen.getByText('Check Conditions'));

    // Check accessible inputs with associated label and spinbutton roles
    const tempInput = screen.getByRole('spinbutton', { name: /temperature/i });
    expect(tempInput).toBeInTheDocument();
    expect(tempInput).toHaveAttribute('type', 'number');

    const humidityInput = screen.getByRole('spinbutton', { name: /relative humidity/i });
    expect(humidityInput).toBeInTheDocument();

    const windInput = screen.getByRole('spinbutton', { name: /wind speed/i });
    expect(windInput).toBeInTheDocument();

    const rainInput = screen.getByRole('spinbutton', { name: /precipitation/i });
    expect(rainInput).toBeInTheDocument();

    const pressureInput = screen.getByRole('spinbutton', { name: /atmospheric pressure/i });
    expect(pressureInput).toBeInTheDocument();
  });

  test('clicking Reset to Baseline resets form values and recalculates prediction', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Check Conditions'));

    const resetButton = screen.getByRole('button', { name: /Reset to Baseline/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Prediction successfully retrieved from FastAPI backend server|Loaded preset/i)
      ).toBeInTheDocument();
    });
  });

  test('opens Health Officer Contact dialog, validates fields, and submits inquiry', async () => {
    render(<App />);
    // Navigate to School Protocols tab
    fireEvent.click(screen.getByText('School Protocols'));

    const openContactBtn = screen.getByRole('button', { name: /Open Health Contact & Incident Form/i });
    fireEvent.click(openContactBtn);

    expect(screen.getByText(/Contact School Health & Safety Officer/i)).toBeInTheDocument();

    // Trigger validation by clicking submit with empty fields
    const submitBtn = screen.getByRole('button', { name: /Submit Message/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter your full name/i)).toBeInTheDocument();
    });

    // Fill valid data and submit
    fireEvent.change(screen.getByLabelText(/Your Full Name/i), { target: { value: 'Officer Mike' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'mike@school.nsw.edu.au' } });
    fireEvent.change(screen.getByLabelText(/Details \/ Observations/i), { target: { value: 'Oval air quality verified.' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Incident report from Officer Mike/i)).toBeInTheDocument();
    });
  });
});
