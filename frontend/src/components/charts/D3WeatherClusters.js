import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const COLORS = ['#16a34a', '#f59e0b', '#dc2626'];
const LABELS = ['Safe', 'Caution', 'Unsafe'];

// Actual observations from Processed_Sydney_AQI.csv (not synthetic K-Means centroids).
export default function D3WeatherClusters({ darkMode = false }) {
  const svgRef = useRef(null);
  const [observations, setObservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [weekday, setWeekday] = useState('');
  const [hour, setHour] = useState('');
  const [hovered, setHovered] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ limit: '1200' });
    if (weekday !== '') query.set('day_of_week', weekday);
    if (hour !== '') query.set('hour', hour);
    axios.get(`${API}/history?${query.toString()}`, { timeout: 10000 })
      .then(({ data }) => { if (active) setObservations(data.observations || []); })
      .catch(() => { if (active) setError('Historical observations unavailable. Start the FastAPI backend to load the real dataset.'); });
    return () => { active = false; };
  }, [weekday, hour]);

  const filtered = useMemo(() => filter === 'all' ? observations : observations.filter(d => d.safety_level === Number(filter)), [observations, filter]);

  useEffect(() => {
    if (!svgRef.current || !filtered.length) return;
    const width = 620, height = 340, margin = { top: 18, right: 24, bottom: 52, left: 58 };
    const iw = width - margin.left - margin.right, ih = height - margin.top - margin.bottom;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(observations, d => d.temperature)).nice().range([0, iw]);
    const y = d3.scaleLinear().domain([0, Math.max(10, d3.max(observations, d => d.pm25) * 1.08)]).nice().range([ih, 0]);
    g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x)).call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569'));
    g.append('g').call(d3.axisLeft(y)).call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569'));
    g.selectAll('.domain,.tick line').attr('stroke', darkMode ? '#475569' : '#cbd5e1');
    g.append('text').attr('x', iw / 2).attr('y', ih + 42).attr('text-anchor', 'middle').attr('fill', darkMode ? '#e2e8f0' : '#334155').text('Temperature (°C)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -43).attr('text-anchor', 'middle').attr('fill', darkMode ? '#e2e8f0' : '#334155').text('PM2.5 (µg/m³)');
    g.selectAll('circle').data(filtered).join('circle').attr('cx', d => x(d.temperature)).attr('cy', d => y(d.pm25))
      .attr('r', 4.2).attr('fill', d => COLORS[d.safety_level] || '#64748b').attr('opacity', 0.62)
      .attr('stroke', darkMode ? '#0f172a' : '#fff').attr('stroke-width', 0.7)
      .on('mouseenter', (_, d) => setHovered(d)).on('mouseleave', () => setHovered(null));
  }, [filtered, observations, darkMode]);

  return <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
      <label style={{ fontSize: 12, color: darkMode ? '#cbd5e1' : '#475569' }}>Weekday <select aria-label="Filter weekday" value={weekday} onChange={e => setWeekday(e.target.value)} style={{ marginLeft: 5, padding: 5, borderRadius: 6 }}><option value="">All days</option>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
      <label style={{ fontSize: 12, color: darkMode ? '#cbd5e1' : '#475569' }}>Hour <select aria-label="Filter hour" value={hour} onChange={e => setHour(e.target.value)} style={{ marginLeft: 5, padding: 5, borderRadius: 6 }}><option value="">All hours</option>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}</select></label>
      <button onClick={() => { setWeekday(''); setHour(''); setFilter('all'); }} style={{ border: '1px solid #94a3b8', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', background: 'transparent', color: darkMode ? '#e2e8f0' : '#334155' }}>Reset filters</button>
    </div>
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
      {[['all', 'All'], ['0', 'Safe'], ['1', 'Caution'], ['2', 'Unsafe']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} style={{ border: '1px solid #94a3b8', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', background: filter === value ? '#2563eb' : 'transparent', color: filter === value ? '#fff' : (darkMode ? '#e2e8f0' : '#334155') }}>{label}</button>)}
    </div>
    {error && <p role="status" style={{ color: '#d97706', fontSize: 13 }}>{error}</p>}
    {!observations.length && !error && <p>Loading actual dataset observations…</p>}
    {observations.length > 0 && <><svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div style={{ fontSize: 12, color: darkMode ? '#94a3b8' : '#64748b' }}>Showing {filtered.length.toLocaleString()} sampled observations matching the selected filters from the historical dataset. Point colour represents the recorded safety class.</div>
      {hovered && <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: darkMode ? '#1e293b' : '#f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
        <span><b>Temperature:</b> {hovered.temperature.toFixed(1)}°C</span><span><b>PM2.5:</b> {hovered.pm25.toFixed(1)} µg/m³</span><span><b>Humidity:</b> {hovered.humidity.toFixed(1)}%</span><span><b>Wind:</b> {hovered.wind_speed.toFixed(1)} m/s</span><span><b>Recorded class:</b> {LABELS[hovered.safety_level]}</span>
      </div>}</>}
  </div>;
}
