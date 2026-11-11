import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function D3WeekdayHeatmap({ darkMode = false }) {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [error, setError] = useState('');

  // Historical averages come from the backend and refresh once a minute while this page is open.
  useEffect(() => {
    let active = true;
    const loadSummary = () => axios.get(`${API}/weekday-hour`, { timeout: 10000 })
      .then(({ data: result }) => { if (active) { setData(result); setError(''); } })
      .catch(() => { if (active) setError('Unable to load weekday/hour summaries. Check that the backend is running.'); });

    loadSummary();
    const refreshId = window.setInterval(loadSummary, 60000);
    return () => { active = false; window.clearInterval(refreshId); };
  }, []);

  // Place each weekday/hour result in a cell and use color to compare pollution levels.
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Increased bottom margin to accommodate the detailed axis and legend
    const width = 620, height = 320, margin = { top: 28, right: 20, bottom: 60, left: 48 };
    const iw = width - margin.left - margin.right, ih = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand().domain(d3.range(24)).range([0, iw]).padding(0.08);
    const y = d3.scaleBand().domain(d3.range(7)).range([0, ih]).padding(0.1);
    const max = d3.max(data, d => d.avg_pm25) || 1;

    // Color Scale (Green -> Yellow -> Red)
    const safeColor = d3.scaleSequential().domain([max, 0]).interpolator(d3.interpolateRdYlGn);

    // Cells
    g.selectAll('rect').data(data).join('rect')
      .attr('x', d => x(d.hour))
      .attr('y', d => y(d.day))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => safeColor(d.avg_pm25))
      .attr('stroke', darkMode ? '#0f172a' : '#fff')
      .attr('stroke-width', 1)
      .on('mouseenter', (_, d) => setHovered(d))
      .on('mouseleave', () => setHovered(null));

    // X-Axis (Time)
    g.append('g')
      .attr('transform', `translate(0,${ih})`)
      .call(
        d3.axisBottom(x)
          .tickValues([0, 3, 6, 9, 12, 15, 18, 21])
          .tickFormat(h => `${h}:00`)
          .offset(0.5) // ⚡ Centers the tick label directly below the middle of the cell
      )
      .call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569').attr('dy', '0.8em'));

    // Y-Axis (Days)
    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => DAYS[d]))
      .call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569'));

    // Axis Lines
    g.selectAll('.domain,.tick line').attr('stroke', darkMode ? '#475569' : '#cbd5e1');

  }, [data, darkMode]);

  // Helper to calculate exact percentage positions for the 25 and 50 thresholds
  const maxVal = d3.max(data, d => d.avg_pm25) || 1;
  const val25Pos = Math.min(100, Math.max(0, (1 - (25 / maxVal)) * 100));
  const val50Pos = Math.min(100, Math.max(0, (1 - (50 / maxVal)) * 100));

  return (
    <div style={{ width: '100%' }}>
      {error && <p role="status" style={{ color: '#d97706', fontSize: 13 }}>{error}</p>}

      {!data.length && !error && <p>Loading weekday/hour summaries…</p>}

      {data.length > 0 && (
        <>
          <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />

          {/* Enhanced Gradient Legend with Thresholds */}
          <div style={{ padding: '0 10px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: darkMode ? '#cbd5e1' : '#475569', marginBottom: 4 }}>
              <span>0 µg/m³</span>
              <span>Max: {maxVal.toFixed(1)} µg/m³</span>
            </div>

            <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'linear-gradient(90deg, #d73027, #ffffbf, #1a9850)' }}>
              {/* 25 µg/m³ Threshold Marker */}
              {maxVal > 25 && (
                <div style={{ position: 'absolute', top: 14, left: `${val25Pos}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 6, backgroundColor: darkMode ? '#94a3b8' : '#475569', marginTop: -14 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', whiteSpace: 'nowrap' }}>25 (Caution)</span>
                </div>
              )}

              {/* 50 µg/m³ Threshold Marker */}
              {maxVal > 50 && (
                <div style={{ position: 'absolute', top: 14, left: `${val50Pos}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 6, backgroundColor: darkMode ? '#94a3b8' : '#475569', marginTop: -14 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', whiteSpace: 'nowrap' }}>50 (Unsafe)</span>
                </div>
              )}
            </div>
          </div>

          <p style={{ minHeight: 20, fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginTop: 24, textAlign: 'center' }}>
            {hovered
              ? `${DAYS[hovered.day]} at ${String(hovered.hour).padStart(2, '0')}:00 — ${hovered.avg_pm25.toFixed(2)} µg/m³ average (${hovered.observations.toLocaleString()} obs)`
              : 'Auto-refreshes every 60 seconds. Hover over a cell to inspect its average PM2.5 and observation count.'}
          </p>
        </>
      )}
    </div>
  );
}