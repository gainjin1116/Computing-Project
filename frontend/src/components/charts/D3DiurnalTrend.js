import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

export default function D3DiurnalTrend({ activeParams, predictionResult, darkMode = false }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [filterMode, setFilterMode] = useState('full'); // 'full' (24h) or 'school' (8:00 - 16:00)
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  // Normalize parameters supporting both full and abbreviated keys
  const params = useMemo(() => {
    const base = activeParams || {};
    return {
      t: base.temp ?? base.t ?? 22.0,
      rh: base.humidity ?? base.rh ?? 62.0,
      ws: base.wind_speed ?? base.ws ?? 3.5,
      p: base.pressure ?? base.p ?? 1016.0,
      rain: base.rain ?? 0.0,
      hol: base.is_holiday ?? base.hol ?? 0
    };
  }, [
    activeParams?.temp,
    activeParams?.humidity,
    activeParams?.wind_speed,
    activeParams?.pressure,
    activeParams?.rain,
    activeParams?.is_holiday
  ]);

  // Generate 24h diurnal data points based on atmospheric physics formula
  const rawData = useMemo(() => {
    const data = [];
    for (let k = 0; k < 24; k++) {
      const h = k;
      const tempDelta = 5 * Math.sin(((h - 8) / 24) * 2 * Math.PI);
      const temp = Math.round((params.t + tempDelta) * 10) / 10;
      const rh = Math.max(20, Math.min(95, Math.round(params.rh - tempDelta * 2.2)));
      const rush = Math.exp(-Math.pow((h - 8) / 2.2, 2)) + 0.65 * Math.exp(-Math.pow((h - 18) / 2.5, 2));
      const v = 12 + 1.5 * Math.max(0, temp - 20) - 0.22 * (rh - 50) - 0.3 * params.ws + 0.5 * (params.p - 1013) - 5 * params.rain + 5.5 * rush - (params.hol ? 2.5 : 0);
      let pm25 = Math.max(2, Math.min(130, Math.round(v * 10) / 10));

      let status = pm25 <= 25 ? 'Safe' : pm25 <= 50 ? 'Caution' : 'Unsafe';

      if (h >= 10 && h <= 13 && predictionResult?.override_applied) {
        if (predictionResult.prediction === 2) {
          status = 'Unsafe';
          pm25 = Math.max(52.5, pm25);
        } else if (predictionResult.prediction === 1 && status === 'Safe') {
          status = 'Caution';
          pm25 = Math.max(26.0, pm25);
        }
      }

      const statusColor = pm25 <= 25 ? '#16a34a' : pm25 <= 50 ? '#f59e0b' : '#dc2626';

      data.push({
        hour: h,
        timeLabel: `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`,
        pm25,
        temp,
        rh,
        isRecess: h >= 10 && h <= 13,
        status,
        statusColor
      });
    }
    return data;
  }, [params, predictionResult]);

  const recessSummary = useMemo(() => {
    const points = rawData.filter(d => d.hour >= 11 && d.hour <= 13);
    if (!points.length) return null;
    const values = points.map(d => d.pm25);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    const status = max > 50 ? 'Unsafe' : (avg > 25 || max > 25) ? 'Caution' : 'Safe';
    const statusColor = status === 'Safe' ? '#16a34a' : status === 'Caution' ? '#f59e0b' : '#dc2626';
    const statusBg = status === 'Safe'
      ? (darkMode ? 'rgba(22, 163, 74, 0.16)' : '#f0fdf4')
      : status === 'Caution'
        ? (darkMode ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb')
        : (darkMode ? 'rgba(220, 38, 38, 0.16)' : '#fef2f2');
    const statusIcon = status === 'Safe' ? '🟢' : status === 'Caution' ? '⚠' : '⛔';
    const recommendation = status === 'Safe'
      ? 'Normal outdoor recess & sports permitted'
      : status === 'Caution'
        ? 'Limit aerobic activity · Check asthmatic pupils'
        : 'Hazardous air · Suspend outdoor recess immediately';

    return { min, max, avg, status, statusColor, statusBg, statusIcon, recommendation };
  }, [rawData, darkMode]);

  const dailyPeak = useMemo(() => {
    if (!rawData.length) return null;
    return rawData.reduce((prev, curr) => curr.pm25 > prev.pm25 ? curr : prev, rawData[0]);
  }, [rawData]);

  const dataset = useMemo(() => {
    return filterMode === 'school' ? rawData.filter(d => d.hour >= 8 && d.hour <= 16) : rawData;
  }, [rawData, filterMode]);

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 30, right: 35, bottom: 50, left: 45 };
    const width = 720;
    const height = 320;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xMin = d3.min(dataset, d => d.hour);
    const xMax = d3.max(dataset, d => d.hour);

    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, innerWidth]);

    const yMax = Math.max(65, Math.ceil((d3.max(dataset, d => d.pm25) + 12) / 10) * 10);
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    const y25 = yScale(25);
    const y50 = yScale(50);

    g.append('rect')
      .attr('x', 0).attr('y', y25).attr('width', innerWidth).attr('height', innerHeight - y25)
      .attr('fill', darkMode ? 'rgba(34, 197, 94, 0.025)' : 'rgba(34, 197, 94, 0.03)')
      .attr('pointer-events', 'none');

    g.append('rect')
      .attr('x', 0).attr('y', y50).attr('width', innerWidth).attr('height', y25 - y50)
      .attr('fill', darkMode ? 'rgba(245, 158, 11, 0.025)' : 'rgba(245, 158, 11, 0.03)')
      .attr('pointer-events', 'none');

    g.append('rect')
      .attr('x', 0).attr('y', 0).attr('width', innerWidth).attr('height', y50)
      .attr('fill', darkMode ? 'rgba(239, 68, 68, 0.025)' : 'rgba(239, 68, 68, 0.03)')
      .attr('pointer-events', 'none');

    const yTicks = [10, 20, 30, 40, 50, 60].filter(v => v <= yMax);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none');

    const rStart = Math.max(10.5, xMin);
    const rEnd = Math.min(13.5, xMax);
    if (rStart < rEnd) {
      const rx1 = xScale(rStart);
      const rx2 = xScale(rEnd);
      const rWidth = rx2 - rx1;

      g.append('rect')
        .attr('x', rx1).attr('width', rWidth).attr('y', 0).attr('height', innerHeight)
        .attr('fill', darkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.12)')
        .attr('rx', 4)
        .attr('pointer-events', 'none');

      g.append('line')
        .attr('x1', rx1).attr('x2', rx1).attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', darkMode ? '#64748b' : '#94a3b8').attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3').attr('opacity', 0.4).attr('pointer-events', 'none');

      g.append('line')
        .attr('x1', rx2).attr('x2', rx2).attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', darkMode ? '#64748b' : '#94a3b8').attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3').attr('opacity', 0.4).attr('pointer-events', 'none');

      const rCenterX = (rx1 + rx2) / 2;
      const pillW = 190;
      const pillH = 22;

      g.append('rect')
        .attr('x', rCenterX - pillW / 2).attr('y', 0)
        .attr('width', pillW).attr('height', pillH).attr('rx', 11)
        .attr('fill', darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)')
        .attr('stroke', darkMode ? '#64748b' : '#94a3b8')
        .attr('stroke-width', 1).attr('stroke-opacity', 0.5).attr('pointer-events', 'none');

      g.append('text')
        .attr('x', rCenterX).attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#cbd5e1' : '#475569')
        .attr('font-size', '10px').attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .text('School Recess & Lunch · 10:30–13:30');
    }

    if (xMin <= 8 && 8 <= xMax) {
      g.append('line')
        .attr('x1', xScale(8)).attr('x2', xScale(8))
        .attr('y1', 22).attr('y2', innerHeight)
        .attr('stroke', darkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.3)')
        .attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('pointer-events', 'none');

      g.append('text')
        .attr('x', xScale(8))
        .attr('y', innerHeight + 32)
        .attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#94a3b8' : '#64748b')
        .attr('font-size', '10px').attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .text('08:00 School Starts');
    }

    if (xMin <= 16 && 16 <= xMax) {
      g.append('line')
        .attr('x1', xScale(16)).attr('x2', xScale(16))
        .attr('y1', 22).attr('y2', innerHeight)
        .attr('stroke', darkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.3)')
        .attr('stroke-width', 1).attr('stroke-dasharray', '3 3').attr('pointer-events', 'none');

      g.append('text')
        .attr('x', xScale(16))
        .attr('y', innerHeight + 32)
        .attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#94a3b8' : '#64748b')
        .attr('font-size', '10px').attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .text('16:00 School Ends');
    }

    const thresholds = [
      { val: 25, label: 'Caution (25 µg/m³)', color: '#f59e0b' },
      { val: 50, label: 'Unsafe (50 µg/m³)', color: '#ef4444' }
    ];

    thresholds.forEach(t => {
      if (t.val <= yMax) {
        g.append('line')
          .attr('x1', 0).attr('x2', innerWidth)
          .attr('y1', yScale(t.val)).attr('y2', yScale(t.val))
          .attr('stroke', t.color).attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4').attr('opacity', 0.35).attr('pointer-events', 'none');

        g.append('text')
          .attr('x', innerWidth - 6).attr('y', yScale(t.val) - 5)
          .attr('text-anchor', 'end').attr('fill', t.color)
          .attr('font-size', '9.5px').attr('font-weight', '700')
          .attr('opacity', 0.7).attr('pointer-events', 'none').text(t.label);
      }
    });

    const defs = svg.append('defs');
    const createGradient = (id, color) => {
      const grad = defs.append('linearGradient')
        .attr('id', id).attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.25);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.01);
    };
    createGradient('gradSafe', '#16a34a');
    createGradient('gradCaution', '#f59e0b');
    createGradient('gradUnsafe', '#dc2626');

    const maxPm25 = d3.max(dataset, d => d.pm25);
    const areaGradUrl = maxPm25 > 50 ? 'url(#gradUnsafe)' : maxPm25 > 25 ? 'url(#gradCaution)' : 'url(#gradSafe)';

    const area = d3.area()
      .x(d => xScale(d.hour)).y0(innerHeight).y1(d => yScale(d.pm25)).curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataset).attr('fill', areaGradUrl).attr('d', area).attr('pointer-events', 'none');

    const line = d3.line()
      .x(d => xScale(d.hour)).y(d => yScale(d.pm25)).curve(d3.curveMonotoneX);

    const segments = [];
    let currentSegment = [];
    let currentColor = null;

    dataset.forEach((d, i) => {
      let color = d.pm25 <= 25 ? '#16a34a' : d.pm25 <= 50 ? '#f59e0b' : '#dc2626';
      if (currentColor === null) { currentColor = color; }
      else if (color !== currentColor) {
        if (currentSegment.length > 0) {
          currentSegment.push(d);
          segments.push({ color: currentColor, data: [...currentSegment] });
        }
        currentSegment = [dataset[i - 1], d];
        currentColor = color;
      } else { currentSegment.push(d); }
      if (i === dataset.length - 1 && currentSegment.length > 0) {
        segments.push({ color: currentColor, data: [...currentSegment] });
      }
    });

    segments.forEach(seg => {
      g.append('path')
        .datum(seg.data).attr('fill', 'none')
        .attr('stroke', seg.color).attr('stroke-width', 3)
        .attr('d', line).attr('pointer-events', 'none');
    });

    if (dailyPeak && dailyPeak.hour >= xMin && dailyPeak.hour <= xMax) {
      const peakX = xScale(dailyPeak.hour);
      const peakY = yScale(dailyPeak.pm25);

      g.append('circle')
        .attr('cx', peakX).attr('cy', peakY).attr('r', 8).attr('fill', 'none')
        .attr('stroke', dailyPeak.pm25 > 50 ? '#ef4444' : dailyPeak.pm25 > 25 ? '#f59e0b' : '#16a34a')
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '2 2').attr('opacity', 0.8)
        .attr('pointer-events', 'none');

      const calloutText = `Daily peak · ${dailyPeak.pm25.toFixed(1)} µg/m³ · ${dailyPeak.hour}:00`;
      const calloutW = 152;
      const calloutH = 20;
      const calloutY = Math.max(12, peakY - 26);
      const calloutX = Math.max(calloutW / 2 + 5, Math.min(innerWidth - calloutW / 2 - 5, peakX));

      g.append('line')
        .attr('x1', peakX).attr('x2', calloutX).attr('y1', peakY - 8).attr('y2', calloutY + calloutH)
        .attr('stroke', darkMode ? '#cbd5e1' : '#475569').attr('stroke-width', 1)
        .attr('stroke-dasharray', '2 2').attr('pointer-events', 'none');

      g.append('rect')
        .attr('x', calloutX - calloutW / 2).attr('y', calloutY)
        .attr('width', calloutW).attr('height', calloutH).attr('rx', 6)
        .attr('fill', darkMode ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.96)')
        .attr('stroke', dailyPeak.pm25 > 50 ? '#ef4444' : dailyPeak.pm25 > 25 ? '#f59e0b' : '#16a34a')
        .attr('stroke-width', 1.2).attr('pointer-events', 'none');

      g.append('text')
        .attr('x', calloutX).attr('y', calloutY + 14).attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#f8fafc' : '#0f172a').attr('font-size', '9.5px')
        .attr('font-weight', '700').attr('pointer-events', 'none').text(calloutText);
    }

    g.selectAll('.data-circle')
      .data(dataset).enter().append('circle')
      .attr('class', 'data-circle')
      .attr('cx', d => xScale(d.hour)).attr('cy', d => yScale(d.pm25)).attr('r', 4.5)
      .attr('fill', d => d.statusColor)
      .attr('stroke', darkMode ? '#0f172a' : '#ffffff').attr('stroke-width', 2)
      .attr('pointer-events', 'none').style('transition', 'r 0.15s ease, stroke-width 0.15s ease');

    const xAxis = d3.axisBottom(xScale)
      .tickValues(filterMode === 'school'
        ? [8, 10, 12, 14, 16]
        : [0, 2, 4, 6, 10, 12, 14, 18, 20, 22]
      )
      .tickFormat(h => `${h}:00`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`).call(xAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px').attr('font-weight', '500');

    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append('g').call(yAxis).attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px').attr('font-weight', '500');

    g.append('text')
      .attr('transform', 'rotate(-90)').attr('y', -34).attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle').attr('fill', darkMode ? '#94a3b8' : '#64748b')
      .attr('font-size', '11px').attr('font-weight', '700').text('PM2.5 (µg/m³)');

    const crosshair = g.append('line')
      .attr('y1', 0).attr('y2', innerHeight).attr('stroke', darkMode ? '#94a3b8' : '#475569')
      .attr('stroke-width', 1.2).attr('stroke-dasharray', '3 3').style('opacity', 0).style('pointer-events', 'none');

    const highlightCircle = g.append('circle')
      .attr('r', 7.5).attr('fill', '#2563eb').attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5).style('opacity', 0).style('pointer-events', 'none');

    const overlay = g.append('rect')
      .attr('width', innerWidth).attr('height', innerHeight)
      .attr('fill', 'transparent').style('cursor', 'crosshair').style('touch-action', 'pan-y');

    const updatePointer = (event) => {
      let coords;
      if (event.touches && event.touches.length > 0) { coords = d3.pointer(event.touches[0], overlay.node()); }
      else { coords = d3.pointer(event, overlay.node()); }
      const mx = Math.max(0, Math.min(innerWidth, coords[0]));
      const xHour = xScale.invert(mx);
      const bisect = d3.bisector(d => d.hour).center;
      const index = bisect(dataset, xHour);
      const selected = dataset[index];

      if (selected && containerRef.current) {
        const cx = xScale(selected.hour);
        const cy = yScale(selected.pm25);

        crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 1);
        highlightCircle.attr('cx', cx).attr('cy', cy).attr('fill', selected.statusColor).style('opacity', 1);

        const containerRect = containerRef.current.getBoundingClientRect();
        const svgRect = svgRef.current.getBoundingClientRect();
        const scaleX = svgRect.width / width;
        const scaleY = svgRect.height / height;
        const screenX = (margin.left + cx) * scaleX;
        const screenY = (margin.top + cy) * scaleY + (svgRef.current.offsetTop || 0);

        setTooltipPos({ x: Math.max(80, Math.min(containerRect.width - 80, screenX)), y: screenY });
        setHoveredData(selected);
      }
    };

    const clearPointer = () => {
      crosshair.style('opacity', 0); highlightCircle.style('opacity', 0);
      setHoveredData(null); setTooltipPos(null);
    };

    overlay
      .on('mousemove', updatePointer).on('touchmove', updatePointer)
      .on('touchstart', updatePointer).on('mouseleave', clearPointer).on('touchend', clearPointer);

  }, [dataset, filterMode, darkMode, recessSummary, dailyPeak]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {recessSummary && (
        <div
          className="recess-summary-grid"
          style={{
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.45)' : '#f8fafc',
            border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
            padding: '12px 16px', marginBottom: '12px'
          }}
        >
          <div className="recess-summary-col">
            <span className="recess-summary-label" style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Recess Window</span>
            <div className="recess-summary-value">
              <strong style={{ fontSize: '15px', color: darkMode ? '#f8fafc' : '#0f172a' }}>10:30 – 13:30</strong>
            </div>
          </div>
          <div className="recess-summary-col">
            <span className="recess-summary-label" style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Average PM2.5</span>
            <div className="recess-summary-value">
              <strong style={{ fontSize: '15px', color: recessSummary.statusColor }}>{recessSummary.avg.toFixed(1)} µg/m³</strong>
            </div>
          </div>
          <div className="recess-summary-col">
            <span className="recess-summary-label" style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Recess Range</span>
            <div className="recess-summary-value">
              <strong style={{ fontSize: '15px', color: darkMode ? '#f8fafc' : '#0f172a' }}>{recessSummary.min.toFixed(1)} – {recessSummary.max.toFixed(1)} µg/m³</strong>
            </div>
          </div>
          <div className="recess-summary-col">
            <span className="recess-summary-label" style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Recess Risk Status</span>
            <div className="recess-summary-value">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
                borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                color: recessSummary.statusColor, backgroundColor: recessSummary.statusBg
              }}>
                {recessSummary.statusIcon} {recessSummary.status}
              </span>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', borderTop: `1px dashed ${darkMode ? '#334155' : '#e2e8f0'}`, paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: darkMode ? '#cbd5e1' : '#334155' }}>
              <strong>School Recommendation:</strong> {recessSummary.recommendation}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: darkMode ? '#cbd5e1' : '#334155' }}>Filter:</span>
          <button
            onClick={() => setFilterMode('full')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '6px',
              border: `1px solid ${filterMode === 'full' ? '#2563eb' : darkMode ? '#334155' : '#e2e8f0'}`,
              backgroundColor: filterMode === 'full' ? '#2563eb' : darkMode ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
              color: filterMode === 'full' ? '#ffffff' : darkMode ? '#cbd5e1' : '#475569',
              boxShadow: filterMode === 'full' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none',
              cursor: 'pointer', minHeight: '32px', transition: 'all 0.15s ease'
            }}
          >24-Hour Cycle</button>
          <button
            onClick={() => setFilterMode('school')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '6px',
              border: `1px solid ${filterMode === 'school' ? '#2563eb' : darkMode ? '#334155' : '#e2e8f0'}`,
              backgroundColor: filterMode === 'school' ? '#2563eb' : darkMode ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
              color: filterMode === 'school' ? '#ffffff' : darkMode ? '#cbd5e1' : '#475569',
              boxShadow: filterMode === 'school' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : 'none',
              cursor: 'pointer', minHeight: '32px', transition: 'all 0.15s ease'
            }}
          >School Hours (8:00 - 16:00)</button>
        </div>
        <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
          Hover along timeline to inspect hourly PM2.5, risk level, and recess window
        </div>
      </div>

      {hoveredData && tooltipPos && (
        <div
          style={{
            position: 'absolute', left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -115%)', pointerEvents: 'none', zIndex: 30,
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(8px)', border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.16)', borderRadius: '10px',
            padding: '10px 14px', minWidth: '160px', fontSize: '12px', lineHeight: 1.5,
            transition: 'left 0.06s ease-out, top 0.06s ease-out'
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '13px', color: darkMode ? '#f8fafc' : '#0f172a', marginBottom: '4px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, paddingBottom: '4px' }}>
            {hoveredData.timeLabel}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
            <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>PM2.5:</span>
            <strong style={{ color: hoveredData.statusColor }}>{hoveredData.pm25.toFixed(1)} µg/m³</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
            <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Risk:</span>
            <strong style={{ color: hoveredData.statusColor }}>{hoveredData.status}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
            <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>School Hours:</span>
            <strong style={{ color: hoveredData.hour >= 8 && hoveredData.hour <= 16 ? '#2563eb' : 'inherit' }}>
              {hoveredData.hour >= 8 && hoveredData.hour <= 16 ? 'Yes' : 'No'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Recess/Lunch:</span>
            <strong style={{ color: hoveredData.isRecess ? '#2563eb' : 'inherit' }}>
              {hoveredData.isRecess ? 'Yes' : 'No'}
            </strong>
          </div>
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginTop: '4px',
          paddingTop: '8px',
          borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
          <span style={{ color: darkMode ? '#cbd5e1' : '#475569', fontWeight: 600 }}>Safe (0–25 µg/m³)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span style={{ color: darkMode ? '#cbd5e1' : '#475569', fontWeight: 600 }}>Caution (25–50 µg/m³)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
          <span style={{ color: darkMode ? '#cbd5e1' : '#475569', fontWeight: 600 }}>Unsafe (&gt; 50 µg/m³)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '14px', height: '10px', borderRadius: '3px', backgroundColor: darkMode ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0', border: '1px solid #94a3b8' }} />
          <span style={{ color: darkMode ? '#cbd5e1' : '#475569', fontWeight: 600 }}>School Recess & Lunch (10:30–13:30)</span>
        </div>
      </div>
    </div>
  );
}