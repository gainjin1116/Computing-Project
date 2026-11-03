import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function D3GaugeChart({ value = 12, maxVal = 100, darkMode = false }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 360;
    const height = 220;
    const cx = width / 2;
    const cy = 175;
    const radius = 135;
    const innerRadius = 104;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g');

    // Threshold segments in radians: -Math.PI/2 to Math.PI/2
    // Safe: 0 - 25 -> 25% of 180° = 45° (-90° to -45°)
    // Caution: 25 - 50 -> 25% of 180° = 45° (-45° to 0°)
    // Unsafe: 50 - 100 -> 50% of 180° = 90° (0° to 90°)
    const segments = [
      { start: -Math.PI / 2, end: -Math.PI / 4, color: '#2e7d32', label: '0–25', title: 'Safe' },
      { start: -Math.PI / 4, end: 0, color: '#ed6c02', label: '25–50', title: 'Caution' },
      { start: 0, end: Math.PI / 2, color: '#d32f2f', label: '50+', title: 'Unsafe' }
    ];

    const arcGen = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    segments.forEach((seg) => {
      // Draw arc segment
      g.append('path')
        .attr('transform', `translate(${cx}, ${cy})`)
        .attr('d', arcGen({
          startAngle: seg.start,
          endAngle: seg.end
        }))
        .attr('fill', seg.color)
        .attr('opacity', 0.9);

      // Add explicit threshold range text along each arc segment
      const midAngle = (seg.start + seg.end) / 2;
      const textRadius = (innerRadius + radius) / 2;
      const xText = cx + textRadius * Math.sin(midAngle);
      const yText = cy - textRadius * Math.cos(midAngle);

      g.append('text')
        .attr('x', xText)
        .attr('y', yText + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.5px')
        .text(seg.label);
    });

    // Numerical tick marks along outer border
    const ticks = [
      { val: 0, label: '0' },
      { val: 25, label: '25' },
      { val: 50, label: '50' },
      { val: 100, label: '100' }
    ];

    ticks.forEach((tick) => {
      const angle = -Math.PI / 2 + (Math.min(tick.val, 100) / 100) * Math.PI;
      const xTick = cx + (radius + 14) * Math.sin(angle);
      const yTick = cy - (radius + 14) * Math.cos(angle);

      g.append('text')
        .attr('x', xTick)
        .attr('y', yTick + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', darkMode ? '#94a3b8' : '#64748b')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(tick.label);
    });

    // Arc Zone Category Labels outside the dial
    const zoneLabels = [
      { angle: -Math.PI * 0.375, text: 'Safe (0-25)', color: '#2e7d32' },
      { angle: -Math.PI * 0.125, text: 'Caution (25-50)', color: '#ed6c02' },
      { angle: Math.PI * 0.25, text: 'Unsafe (50+)', color: '#d32f2f' }
    ];

    zoneLabels.forEach((zone) => {
      const xPos = cx + (radius + 28) * Math.sin(zone.angle);
      const yPos = cy - (radius + 28) * Math.cos(zone.angle);

      g.append('text')
        .attr('x', xPos)
        .attr('y', yPos + 3)
        .attr('text-anchor', 'middle')
        .attr('fill', zone.color)
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text(zone.text);
    });

    // Needle calculation
    const clampedVal = Math.max(0, Math.min(value, 100));
    const targetAngle = -90 + (clampedVal / 100) * 180;

    const needleGroup = g.append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    const needle = needleGroup.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -radius + 22)
      .attr('stroke', darkMode ? '#f8fafc' : '#0f172a')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .attr('transform', 'rotate(-90)');

    needle.transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('transform', `rotate(${targetAngle})`);

    // Center pivot circle
    needleGroup.append('circle')
      .attr('r', 8)
      .attr('fill', darkMode ? '#f8fafc' : '#0f172a');

    needleGroup.append('circle')
      .attr('r', 3.5)
      .attr('fill', darkMode ? '#1e293b' : '#ffffff');

    // Central text readout
    g.append('text')
      .attr('x', cx)
      .attr('y', cy + 24)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#f1f5f9' : '#0f172a')
      .attr('font-size', '17px')
      .attr('font-weight', '800')
      .text(`${value.toFixed(1)} µg/m³ PM2.5`);

  }, [value, maxVal, darkMode]);

  return (
    <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Safe', color: '#2e7d32', range: '0–25 µg/m³' },
          { label: 'Caution', color: '#ed6c02', range: '25–50 µg/m³' },
          { label: 'Unsafe', color: '#d32f2f', range: '50+ µg/m³' }
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: item.color }} />
            <span style={{ fontWeight: 700 }}>{item.label}:</span>
            <span style={{ opacity: 0.85 }}>{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
