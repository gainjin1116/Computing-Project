import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function D3WeatherRadar({ params, darkMode = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !params) return;
    // Scale each differently measured weather value onto the same 0-to-100 radar.
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
        .attr('x2', x).attr('y2', y)
        .attr('stroke', darkMode ? '#64748b' : '#94a3b8');
      g.append('text')
        .attr('x', Math.cos(a) * (radius + 24))
        .attr('y', Math.sin(a) * (radius + 24))
        .attr('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 12)
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
      .attr('r', 4)
      .attr('fill', '#0284c7')
      .append('title')
      .text(d => `${d.label}: ${d.value.toFixed(0)} / 100`);
  }, [params, darkMode]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        ref={ref}
        style={{
          width: '100%',
          maxWidth: 400,
          height: 'auto',
          maxHeight: 200,
          display: 'block'
        }}
      />
      <div
        style={{
          fontSize: 12,
          color: darkMode ? '#94a3b8' : '#64748b',
          marginTop: '4px',
          textAlign: 'center',
          lineHeight: 1.4,
          fontWeight: 500,
          maxWidth: '90%'
        }}
      >
        This chart shows the current weather profile. A larger shape towards a point means higher levels for that specific metric.
      </div>
    </div>
  );
}