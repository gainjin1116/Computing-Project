import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Normalised snapshot of the user-selected weather inputs (0–100 display scale).
export default function D3WeatherRadar({ params, darkMode = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !params) return;
    const metrics = [
      { label: 'Temperature', value: Math.max(0, Math.min(100, ((Number(params.temp) + 10) / 60) * 100)) },
      { label: 'Humidity', value: Math.max(0, Math.min(100, Number(params.humidity))) },
      { label: 'Wind speed', value: Math.max(0, Math.min(100, (Number(params.wind_speed) / 50) * 100)) },
      { label: 'Rainfall', value: Math.max(0, Math.min(100, (Number(params.rain) / 50) * 100)) },
      { label: 'Pressure', value: Math.max(0, Math.min(100, ((Number(params.pressure) - 900) / 200) * 100)) }
    ];
    const width = 440, height = 300, cx = 220, cy = 148, radius = 105;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
    const angle = i => (Math.PI * 2 * i / metrics.length) - Math.PI / 2;
    [20, 40, 60, 80, 100].forEach(level => {
      const points = metrics.map((_, i) => [
        Math.cos(angle(i)) * radius * level / 100,
        Math.sin(angle(i)) * radius * level / 100
      ]);
      g.append('polygon')
        .attr('points', points.map(p => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', darkMode ? '#475569' : '#cbd5e1')
        .attr('stroke-dasharray', '3 3');
    });
    metrics.forEach((m, i) => {
      const a = angle(i), x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      g.append('line')
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', darkMode ? '#64748b' : '#94a3b8');
      g.append('text')
        .attr('x', Math.cos(a) * (radius + 24))
        .attr('y', Math.sin(a) * (radius + 24))
        .attr('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 700)
        .attr('fill', darkMode ? '#f1f5f9' : '#1e293b')
        .text(m.label);
    });
    const line = d3.line().curve(d3.curveLinearClosed);
    const pts = metrics.map((m, i) => [
      Math.cos(angle(i)) * radius * m.value / 100,
      Math.sin(angle(i)) * radius * m.value / 100
    ]);
    g.append('path')
      .attr('d', line(pts))
      .attr('fill', '#38bdf8')
      .attr('fill-opacity', 0.32)
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 2.5);
    g.selectAll('circle')
      .data(metrics)
      .join('circle')
      .attr('cx', (d, i) => Math.cos(angle(i)) * radius * d.value / 100)
      .attr('cy', (d, i) => Math.sin(angle(i)) * radius * d.value / 100)
      .attr('r', 4.5)
      .attr('fill', '#0284c7')
      .append('title')
      .text(d => `${d.label}: ${d.value.toFixed(0)} / 100`);
  }, [params, darkMode]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        ref={ref}
        style={{
          width: '100%',
          maxWidth: 440,
          height: 'auto',
          maxHeight: 280,
          display: 'block',
          margin: '0 auto'
        }}
      />
      <p
        style={{
          fontSize: 12.5,
          color: darkMode ? '#94a3b8' : '#64748b',
          margin: '6px 0 0',
          textAlign: 'center',
          lineHeight: 1.35,
          fontWeight: 500
        }}
      >
        Values are independently scaled to 0–100 for visual comparison; they are not model feature contributions.
      </p>
    </div>
  );
}
