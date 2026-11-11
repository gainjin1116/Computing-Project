import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function D3GaugeChart({ value = 12, maxVal = 100, status = 'Safe' }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, zone: '', color: '', tip: '' });

  // Redraw the gauge whenever the latest PM2.5 value or risk level changes.
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 320;
    const height = 200;
    const cx = width / 2;
    const cy = 180;
    const radius = 120;
    const innerRadius = 90;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g');

    // Keep the arc within its scale even if a reading falls outside the expected range.
    const clampedVal = Math.max(0, Math.min(value, maxVal));
    const valueAngle = (clampedVal / maxVal) * Math.PI;

    let currentColor = '#164043';
    if (status === 'Unsafe') {
      currentColor = '#d32f2f';
    } else if (status === 'Caution') {
      currentColor = '#E65100';
    }

    // 1. Draw background track
    const bgArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append('path')
      .attr('transform', `translate(${cx}, ${cy})`)
      .attr('d', bgArc())
      .attr('fill', '#f1f5f9');

    // 2. Draw the interactive progress arc
    if (clampedVal > 0) {
      const progressArcBase = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .startAngle(-Math.PI / 2)
        .endAngle(-Math.PI / 2 + valueAngle);

      const arcGroup = g.append('g')
        .style('cursor', 'pointer')
        .style('transition', 'all 0.3s ease')
        .on('mouseenter', function () {
          d3.select(this).style('filter', 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))').style('opacity', 0.9);
        })
        .on('mousemove', function (event) {
          const [x, y] = d3.pointer(event, svgRef.current);

          let zoneLabel = `${status} Zone`;
          let actionableTip = 'Normal outdoor play allowed.';
          if (status === 'Unsafe') {
            actionableTip = 'Hazardous air. Move indoors immediately.';
          } else if (status === 'Caution') {
            actionableTip = 'Air quality is elevated. Monitor asthmatics.';
          }

          setTooltip({
            show: true,
            x: x,
            y: y,
            zone: zoneLabel,
            color: currentColor,
            tip: actionableTip
          });
        })
        .on('mouseleave', function () {
          d3.select(this).style('filter', 'none').style('opacity', 1);
          setTooltip(prev => ({ ...prev, show: false }));
        });

      arcGroup.append('path')
        .attr('transform', `translate(${cx}, ${cy})`)
        .attr('d', progressArcBase())
        .attr('fill', currentColor);

      const endX = cx + ((innerRadius + radius) / 2) * Math.sin(-Math.PI / 2 + valueAngle);
      const endY = cy - ((innerRadius + radius) / 2) * Math.cos(-Math.PI / 2 + valueAngle);

      arcGroup.append('circle')
        .attr('cx', endX)
        .attr('cy', endY)
        .attr('r', (radius - innerRadius) / 2)
        .attr('fill', currentColor);
    }

    // 3. Draw subtle Tick Marks
    const thresholds = [
      { val: 25, showLine: true },
      { val: 50, showLine: true },
      { val: 75, showLine: true }
    ];

    thresholds.forEach((tick) => {
      const tickAngle = -Math.PI / 2 + (tick.val / maxVal) * Math.PI;

      if (tick.showLine) {
        const x1 = cx + (innerRadius - 1) * Math.sin(tickAngle);
        const y1 = cy - (innerRadius - 1) * Math.cos(tickAngle);
        const x2 = cx + (radius + 1) * Math.sin(tickAngle);
        const y2 = cy - (radius + 1) * Math.cos(tickAngle);

        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      }

      const textRadius = radius + 18;
      const tx = cx + textRadius * Math.sin(tickAngle);
      const ty = cy - textRadius * Math.cos(tickAngle);

      g.append('text')
        .attr('x', tx)
        .attr('y', ty + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#475569')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(tick.val);
    });

    // 4. Center Text
    g.append('text')
      .attr('x', cx)
      .attr('y', cy - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#164043')
      .attr('font-size', '42px')
      .attr('font-weight', '900')
      .attr('letter-spacing', '-1px')
      .text(`${value.toFixed(1)}`);

    g.append('text')
      .attr('x', cx)
      .attr('y', cy + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .text('µg/m³ PM2.5');

    // 5. Min/Max Labels
    g.append('text')
      .attr('x', cx - radius - 16)
      .attr('y', cy + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text('0');

    g.append('text')
      .attr('x', cx + radius + 16)
      .attr('y', cy + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text('100');

  }, [value, maxVal, status]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />

      {/* Gauge Tooltip - Action Oriented */}
      {tooltip.show && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 20,
          top: tooltip.y - 20,
          backgroundColor: '#164043',
          color: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 1000,
          width: '160px',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          transform: 'translateY(-50%)',
          borderLeft: `4px solid ${tooltip.color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tooltip.color }} />
            <span style={{ fontWeight: 800, fontSize: '13px' }}>{tooltip.zone}</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>
            {value.toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>µg/m³</span>
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
            {tooltip.tip}
          </div>
        </div>
      )}

      {/* Dynamic Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Safe', color: '#164043', range: '0–25', active: status === 'Safe' },
          { label: 'Caution', color: '#E65100', range: '25–50', active: status === 'Caution' },
          { label: 'Unsafe', color: '#d32f2f', range: '50+', active: status === 'Unsafe' }
        ].map((item) => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            opacity: item.active ? 1 : 0.3,
            transition: 'opacity 0.3s ease'
          }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: item.color }} />
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.label}:</span>
            <span style={{ color: '#64748b' }}>{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}