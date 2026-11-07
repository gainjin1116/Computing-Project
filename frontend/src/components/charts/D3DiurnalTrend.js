import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function D3DiurnalTrend({ activeParams, darkMode = false }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [filterMode, setFilterMode] = useState('full'); // 'full' (24h) or 'school' (8:00 - 16:00)
  const [hoveredData, setHoveredData] = useState(null);

  // Generate 24h diurnal data points based on atmospheric formulas from report
  const generateDiurnalData = (base) => {
    const data = [];
    for (let k = 0; k < 24; k++) {
      const h = k;
      // Diurnal temp swing: lowest at 6am, peak at 14:00 (2pm)
      const tempDelta = 5 * Math.sin(((h - 8) / 24) * 2 * Math.PI);
      const temp = Math.round((base.t + tempDelta) * 10) / 10;
      // Diurnal humidity: inverse to temp
      const rh = Math.max(20, Math.min(95, Math.round(base.rh - tempDelta * 2.2)));
      // Rush hour traffic spikes around 8:00 and 17:30
      const rush = Math.exp(-Math.pow((h - 8) / 2.2, 2)) + 0.65 * Math.exp(-Math.pow((h - 18) / 2.5, 2));
      // Photochemical + dispersion factor
      const v = 12 + 1.5 * Math.max(0, temp - 20) - 0.22 * (rh - 50) - 0.3 * base.ws + 0.5 * (base.p - 1013) - 5 * base.rain + 5.5 * rush - (base.hol ? 2.5 : 0);
      const pm25 = Math.max(2, Math.min(130, Math.round(v * 10) / 10));

      data.push({
        hour: h,
        timeLabel: `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`,
        pm25,
        temp,
        rh,
        isRecess: h >= 10 && h <= 13,
        status: pm25 <= 25 ? 'Safe' : pm25 <= 50 ? 'Caution' : 'Unsafe'
      });
    }
    return data;
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const rawData = generateDiurnalData(activeParams || { t: 22, rh: 65, ws: 8, p: 1015, rain: 0, hol: 0 });
    const dataset = filterMode === 'school' ? rawData.filter(d => d.hour >= 8 && d.hour <= 16) : rawData;

    const margin = { top: 30, right: 30, bottom: 45, left: 50 };
    const width = 640;
    const height = 280;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(dataset, d => d.hour), d3.max(dataset, d => d.hour)])
      .range([0, innerWidth]);

    const yMax = Math.max(65, Math.ceil((d3.max(dataset, d => d.pm25) + 10) / 10) * 10);
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // Recess & Lunch band shading (10:30 to 13:30)
    const recessStart = Math.max(10.5, d3.min(dataset, d => d.hour));
    const recessEnd = Math.min(13.5, d3.max(dataset, d => d.hour));
    if (recessStart < recessEnd) {
      g.append('rect')
        .attr('x', xScale(recessStart))
        .attr('width', xScale(recessEnd) - xScale(recessStart))
        .attr('y', 0)
        .attr('height', innerHeight)
        .attr('fill', darkMode ? '#3b82f6' : '#60a5fa')
        .attr('opacity', darkMode ? 0.15 : 0.18)
        .attr('rx', 4);

      g.append('text')
        .attr('x', (xScale(recessStart) + xScale(recessEnd)) / 2)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#93c5fd' : '#1d4ed8')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text('School Recess & Lunch (10:30 - 13:30)');
    }

    // Threshold lines
    const thresholds = [
      { val: 25, label: 'Caution (25 µg/m³)', color: '#ed6c02' },
      { val: 50, label: 'Unsafe (50 µg/m³)', color: '#d32f2f' }
    ];

    thresholds.forEach(t => {
      if (t.val <= yMax) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(t.val))
          .attr('y2', yScale(t.val))
          .attr('stroke', t.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5 4');

        g.append('text')
          .attr('x', innerWidth - 6)
          .attr('y', yScale(t.val) - 5)
          .attr('text-anchor', 'end')
          .attr('fill', t.color)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text(t.label);
      }
    });

    // Area generator with gradient
    const defs = svg.append('defs');
    const areaGrad = defs.append('linearGradient')
      .attr('id', 'areaGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2563eb').attr('stop-opacity', 0.4);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2563eb').attr('stop-opacity', 0.02);

    const area = d3.area()
      .x(d => xScale(d.hour))
      .y0(innerHeight)
      .y1(d => yScale(d.pm25))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataset)
      .attr('fill', 'url(#areaGrad)')
      .attr('d', area);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.hour))
      .y(d => yScale(d.pm25))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataset)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2.8)
      .attr('d', line);

    // Data points
    g.selectAll('.dot')
      .data(dataset)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.hour))
      .attr('cy', d => yScale(d.pm25))
      .attr('r', 4.5)
      .attr('fill', d => d.pm25 <= 25 ? '#2e7d32' : d.pm25 <= 50 ? '#ed6c02' : '#d32f2f')
      .attr('stroke', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke-width', 1.8);

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(filterMode === 'school' ? 8 : 12)
      .tickFormat(h => `${h}:00`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text')
      .attr('font-size', '11px');

    // Y Axis
    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append('g')
      .call(yAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text')
      .attr('font-size', '11px');

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -36)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#94a3b8' : '#64748b')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('PM2.5 (µg/m³)');

    // Interactive Hover Overlay
    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const crosshair = g.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', darkMode ? '#94a3b8' : '#475569')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3')
      .style('opacity', 0);

    const highlightCircle = g.append('circle')
      .attr('r', 6)
      .attr('fill', '#2563eb')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const xHour = xScale.invert(mx);
        const bisect = d3.bisector(d => d.hour).center;
        const index = bisect(dataset, xHour);
        const selected = dataset[index];

        if (selected) {
          const cx = xScale(selected.hour);
          const cy = yScale(selected.pm25);

          crosshair
            .attr('x1', cx)
            .attr('x2', cx)
            .style('opacity', 1);

          highlightCircle
            .attr('cx', cx)
            .attr('cy', cy)
            .style('opacity', 1);

          setHoveredData(selected);
        }
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        highlightCircle.style('opacity', 0);
        setHoveredData(null);
      });

  }, [activeParams, filterMode, darkMode]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#cbd5e1' : '#334155' }}>
            View Range:{' '}
          </span>
          <button
            onClick={() => setFilterMode('full')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: filterMode === 'full' ? '#2563eb' : 'transparent',
              color: filterMode === 'full' ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
              cursor: 'pointer',
              marginRight: '6px'
            }}
          >
            24-Hour Cycle
          </button>
          <button
            onClick={() => setFilterMode('school')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: filterMode === 'school' ? '#2563eb' : 'transparent',
              color: filterMode === 'school' ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
              cursor: 'pointer'
            }}
          >
            School Hours (8:00 - 16:00)
          </button>
        </div>

        {hoveredData && (
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '8px',
              backgroundColor: darkMode ? '#1e293b' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              display: 'flex',
              gap: '12px'
            }}
          >
            <span>Time: <strong>{hoveredData.timeLabel}</strong></span>
            <span>PM2.5: <strong style={{ color: hoveredData.pm25 <= 25 ? '#2e7d32' : hoveredData.pm25 <= 50 ? '#ed6c02' : '#d32f2f' }}>{hoveredData.pm25} µg/m³ ({hoveredData.status})</strong></span>
            <span>Est. Temp: <strong>{hoveredData.temp}°C</strong></span>
          </div>
        )}
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}
