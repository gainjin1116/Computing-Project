import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('Recess Safety Advisor - Frontend Integration Tests', () => {
  test('renders Recess Safety title and main heading with telemetry sync', async () => {
    render(<App />);
    const titleElements = screen.getAllByText(/Recess Safety/i);
    expect(titleElements.length).toBeGreaterThan(0);

    const mainHeading = screen.getByText(/Recess is a GO/i);
    expect(mainHeading).toBeInTheDocument();

    // Verifies live or local telemetry synchronization badge is rendered
    expect(screen.getByText(/Sync:/i)).toBeInTheDocument();
  });

  test('renders navigation tabs and switches views', () => {
    render(<App />);
    const conditionsTab = screen.getByRole('tab', { name: /Conditions/i });
    expect(conditionsTab).toBeInTheDocument();

    fireEvent.click(conditionsTab);
    expect(screen.getByText(/Weather Simulator/i)).toBeInTheDocument();
  });

  test('validates accessible sliders and input controls on simulator', () => {
    render(<App />);
    // Switch to Conditions tab
    fireEvent.click(screen.getByRole('tab', { name: /Conditions/i }));

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(4);

    const calculateBtn = screen.getByRole('button', { name: /Calculate Safety Level/i });
    expect(calculateBtn).toBeInTheDocument();
  });

  test('clicking Reset to Defaults resets form values and recalculates prediction', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /Conditions/i }));

    const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);

    const calculateBtn = screen.getByRole('button', { name: /Calculate Safety Level/i });
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Prediction retrieved from FastAPI backend|computed via local ML engine/i)
      ).toBeInTheDocument();
    });
  });

  test('opens Health Officer Contact dialog, validates fields, and submits inquiry', async () => {
    render(<App />);
    const contactBtn = screen.getByRole('button', { name: /Support & Contact/i });
    fireEvent.click(contactBtn);

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
