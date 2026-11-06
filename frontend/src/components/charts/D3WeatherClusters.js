<<<<<<< HEAD
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
      <label style={{ fontSize: 12, color: darkMode ? '#cbd5e1' : '#475569' }}>Weekday <select aria-label="Filter weekday" value={weekday} onChange={e => setWeekday(e.target.value)} style={{ marginLeft: 5, padding: 5, borderRadius: 6 }}><option value="">All days</option>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
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
=======
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

// Representative real-world samples categorized into 3 common weather pattern groups
const CLUSTER_DATA = [
  // Group 0: Hot & Still Air (Warm & Humid / Low Wind) -> Elevated PM2.5 (Caution/Unsafe)
  { id: 1, temp: 34.2, rh: 82, pm25: 58.4, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 0.8 },
  { id: 2, temp: 36.5, rh: 78, pm25: 64.1, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 1.1 },
  { id: 3, temp: 31.0, rh: 88, pm25: 48.2, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 1.5 },
  { id: 4, temp: 32.8, rh: 75, pm25: 52.0, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 1.2 },
  { id: 5, temp: 29.5, rh: 84, pm25: 41.5, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 1.8 },
  { id: 6, temp: 35.1, rh: 86, pm25: 68.3, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 0.7 },
  { id: 7, temp: 33.4, rh: 79, pm25: 55.7, cluster: 0, name: 'Group 0: Hot & Still Air (Smoke Trapped)', ws: 0.9 },

  // Group 1: Clean Ocean Breeze / Fresh Air -> Low PM2.5 (Safe)
  { id: 8, temp: 21.4, rh: 62, pm25: 11.2, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 6.5 },
  { id: 9, temp: 19.8, rh: 55, pm25: 8.7, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 8.2 },
  { id: 10, temp: 24.1, rh: 58, pm25: 14.5, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 5.9 },
  { id: 11, temp: 18.5, rh: 65, pm25: 9.8, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 7.4 },
  { id: 12, temp: 22.9, rh: 50, pm25: 12.3, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 6.8 },
  { id: 13, temp: 25.3, rh: 48, pm25: 16.1, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 5.2 },
  { id: 14, temp: 20.2, rh: 60, pm25: 10.4, cluster: 1, name: 'Group 1: Clean Ocean Breeze', ws: 7.1 },

  // Group 2: Cool & Rainy Weather (Rain Cleans Air) -> Very Low PM2.5 (Safe)
  { id: 15, temp: 16.2, rh: 94, pm25: 4.2, cluster: 2, name: 'Group 2: Cool & Rainy Weather', ws: 4.8 },
  { id: 16, temp: 15.0, rh: 96, pm25: 3.5, cluster: 2, name: 'Group 2: Cool & Rainy Weather', ws: 5.5 },
  { id: 17, temp: 17.8, rh: 91, pm25: 5.8, cluster: 2, name: 'Group 2: Cool & Rainy Weather', ws: 4.2 },
  { id: 18, temp: 14.5, rh: 98, pm25: 2.9, cluster: 2, name: 'Group 2: Cool & Rainy Weather', ws: 6.0 },
  { id: 19, temp: 18.2, rh: 89, pm25: 6.1, cluster: 2, name: 'Group 2: Cool & Rainy Weather', ws: 3.9 }
];

export default function D3WeatherClusters({ darkMode = false }) {
  const svgRef = useRef(null);
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Memoize filteredData so reference remains stable across hover re-renders
  const filteredData = useMemo(() => {
    return selectedCluster === 'all'
      ? CLUSTER_DATA
      : CLUSTER_DATA.filter(d => d.cluster === Number(selectedCluster));
  }, [selectedCluster]);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 560;
    const height = 300;
    const margin = { top: 20, right: 25, bottom: 45, left: 50 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([10, 42]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([40, 105]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-innerHeight).tickFormat(''))
      .attr('stroke-opacity', 0.1)
      .attr('color', darkMode ? '#94a3b8' : '#cbd5e1');

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(''))
      .attr('stroke-opacity', 0.1)
      .attr('color', darkMode ? '#94a3b8' : '#cbd5e1');

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => `${d}°C`);
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px');

    g.append('g')
      .call(yAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px');

    // Axis Labels in easy English
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#cbd5e1' : '#475569')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Air Temperature (°C)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#cbd5e1' : '#475569')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Air Humidity (%)');

    // Colors for clusters (Red for hot/still, Blue for ocean breeze, Green for rainy/clean)
    const clusterColors = ['#ef4444', '#3b82f6', '#10b981'];

    // Points with opacity and blend mode to show overlapping data density
    const circles = g.selectAll('circle')
      .data(filteredData, d => d.id)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.temp))
      .attr('cy', d => y(d.rh))
      .attr('r', 0)
      .attr('fill', d => clusterColors[d.cluster])
      .attr('stroke', d => clusterColors[d.cluster])
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)
      .style('mix-blend-mode', darkMode ? 'screen' : 'multiply')
      .style('cursor', 'pointer')
      .style('transition', 'r 0.15s ease, opacity 0.15s ease');

    circles.transition()
      .duration(600)
      .delay((_, i) => i * 25)
      .attr('r', d => Math.max(7, Math.min(15, d.pm25 / 4.2)));

    // Clean mouse/touch handlers
    const handleSelectPoint = function (_, d) {
      d3.select(this)
        .raise()
        .attr('r', 18)
        .attr('opacity', 0.95);
      setHoveredPoint(d);
    };

    const handleDeselectPoint = function (_, d) {
      d3.select(this)
        .attr('r', Math.max(7, Math.min(15, d.pm25 / 4.2)))
        .attr('opacity', 0.6);
      setHoveredPoint(null);
    };

    circles
      .on('mouseenter', handleSelectPoint)
      .on('touchstart', handleSelectPoint)
      .on('click', handleSelectPoint)
      .on('mouseleave', handleDeselectPoint);

  }, [filteredData, darkMode]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
          3 Common Weather Types
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Weather Types' },
            { id: '0', label: 'Hot & Still Air' },
            { id: '1', label: 'Clean Ocean Breeze' },
            { id: '2', label: 'Cool & Rainy' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedCluster(opt.id)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: `1px solid ${selectedCluster === opt.id ? '#2563eb' : darkMode ? '#334155' : '#cbd5e1'}`,
                backgroundColor: selectedCluster === opt.id ? '#2563eb' : 'transparent',
                color: selectedCluster === opt.id ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
                cursor: 'pointer',
                minHeight: '30px'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Tooltip display in plain English */}
      <div style={{ minHeight: '48px', marginTop: '8px' }}>
        {hoveredPoint ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <span><strong>Weather Type:</strong> {hoveredPoint.name}</span>
            <span><strong>Temp:</strong> {hoveredPoint.temp}°C</span>
            <span><strong>Humidity:</strong> {hoveredPoint.rh}%</span>
            <span><strong>Wind:</strong> {hoveredPoint.ws} m/s</span>
            <span>
              <strong>Air Quality:</strong>{' '}
              <span style={{ color: hoveredPoint.pm25 <= 25 ? '#2e7d32' : hoveredPoint.pm25 <= 50 ? '#ed6c02' : '#d32f2f', fontWeight: 700 }}>
                {hoveredPoint.pm25} µg/m³ ({hoveredPoint.pm25 <= 25 ? 'Safe' : hoveredPoint.pm25 <= 50 ? 'Caution' : 'Unsafe'})
              </span>
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: darkMode ? '#64748b' : '#94a3b8', fontStyle: 'italic', paddingTop: '6px' }}>
            Tip: Tap or hover over any circle to see its temperature, humidity, and air quality.
          </div>
        )}
      </div>
    </div>
  );
>>>>>>> zhaoshean
}
