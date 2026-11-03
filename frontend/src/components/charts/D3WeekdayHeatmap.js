import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Uses actual weekday/hour groupings. The source CSV has no calendar date.
export default function D3WeekdayHeatmap({ darkMode = false }) {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const loadSummary = () => axios.get(`${API}/weekday-hour`, { timeout: 10000 })
      .then(({ data: result }) => { if (active) { setData(result); setError(''); } })
      .catch(() => { if (active) setError('Unable to load weekday/hour summaries. Check that the backend is running.'); });
    loadSummary();
    // Refresh the summary every 60 seconds while the dashboard is mounted.
    const refreshId = window.setInterval(loadSummary, 60000);
    return () => { active = false; window.clearInterval(refreshId); };
  }, []);
  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const width = 620, height = 300, margin = { top: 28, right: 20, bottom: 38, left: 48 };
    const iw = width - margin.left - margin.right, ih = height - margin.top - margin.bottom;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove(); svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(d3.range(24)).range([0, iw]).padding(0.08);
    const y = d3.scaleBand().domain(d3.range(7)).range([0, ih]).padding(0.1);
    const max = d3.max(data, d => d.avg_pm25) || 1;
    const color = d3.scaleSequential().domain([0, max]).interpolator(d3.interpolateRdYlGn).unknown('#94a3b8');
    // Reverse the palette so low PM2.5 is green and high PM2.5 is red.
    const safeColor = d3.scaleSequential().domain([max, 0]).interpolator(d3.interpolateRdYlGn);
    g.selectAll('rect').data(data).join('rect').attr('x', d => x(d.hour)).attr('y', d => y(d.day)).attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 3)
      .attr('fill', d => safeColor(d.avg_pm25)).attr('stroke', darkMode ? '#0f172a' : '#fff').attr('stroke-width', 1)
      .on('mouseenter', (_, d) => setHovered(d)).on('mouseleave', () => setHovered(null));
    g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickValues([0, 3, 6, 9, 12, 15, 18, 21]).tickFormat(h => `${h}:00`)).call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569'));
    g.append('g').call(d3.axisLeft(y).tickFormat(d => DAYS[d])).call(a => a.selectAll('text').attr('fill', darkMode ? '#cbd5e1' : '#475569'));
    g.selectAll('.domain,.tick line').attr('stroke', darkMode ? '#475569' : '#cbd5e1');
    void color;
  }, [data, darkMode]);
  return <div style={{ width: '100%' }}>
    {error && <p role="status" style={{ color: '#d97706', fontSize: 13 }}>{error}</p>}
    {!data.length && !error && <p>Loading weekday/hour summaries…</p>}
    {data.length > 0 && <><svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: darkMode ? '#cbd5e1' : '#475569' }}><span>Lower PM2.5</span><div style={{ height: 9, flex: 1, borderRadius: 5, background: 'linear-gradient(90deg,#1a9850,#ffffbf,#d73027)' }} /><span>Higher PM2.5</span></div>
      <p style={{ minHeight: 20, fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569' }}>{hovered ? `${DAYS[hovered.day]} at ${String(hovered.hour).padStart(2, '0')}:00 — ${hovered.avg_pm25.toFixed(2)} µg/m³ average (${hovered.observations.toLocaleString()} observations)` : 'Auto-refreshes every 60 seconds. Hover over a cell to inspect its average PM2.5 and observation count.'}</p>
    </>}
  </div>;
}
