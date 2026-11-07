import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function D3ProbabilityDonut({ probabilities = [0.85, 0.12, 0.03] }) {
  const svgRef = useRef(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, zone: '', color: '', val: 0 });

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 220;
    const height = 220;
    const radius = Math.min(width, height) / 2 - 8; // Shrunk padding
    const innerRadius = radius * 0.6;

    const data = [
      { label: 'Safe', value: probabilities[0] || 0, color: '#164043' },
      { label: 'Caution', value: probabilities[1] || 0, color: '#E65100' },
      { label: 'Unsafe', value: probabilities[2] || 0, color: '#d32f2f' }
    ];

    const maxEntry = data.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), data[0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.style('background', 'transparent');

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4)
      .padAngle(0.03);

    const hoverArc = d3.arc()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 5)
      .cornerRadius(4)
      .padAngle(0.03);

    const paths = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'transform 0.25s ease')
      .each(function (d) {
        this._current = d;
      });

    paths.transition()
      .duration(750)
      .attrTween('d', function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t));
        };
      });

    const centerValueText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('fill', '#164043')
      .attr('font-size', '22px')
      .attr('font-weight', '800')
      .text(`${(maxEntry.value * 100).toFixed(1)}%`);

    const centerLabelText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', maxEntry.color)
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(maxEntry.label);

    paths
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(200).attr('d', hoverArc);
        centerValueText.text(`${(d.data.value * 100).toFixed(1)}%`).attr('fill', '#164043');
        centerLabelText.text(d.data.label).attr('fill', d.data.color);
        setActiveSlice(d.data.label);
      })
      .on('mousemove', function (event, d) {
        const [x, y] = d3.pointer(event, svgRef.current);

        let desc = '';
        if (d.data.label === 'Safe') desc = 'Highest probability. Normal play.';
        if (d.data.label === 'Caution') desc = 'Moderate risk. Stay alert.';
        if (d.data.label === 'Unsafe') desc = 'High risk. Move indoors.';

        setTooltip({
          show: true,
          x: x,
          y: y,
          zone: d.data.label,
          color: d.data.color,
          val: d.data.value,
          tip: desc
        });
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(200).attr('d', arc);
        centerValueText.text(`${(maxEntry.value * 100).toFixed(1)}%`).attr('fill', '#164043');
        centerLabelText.text(maxEntry.label).attr('fill', maxEntry.color);
        setActiveSlice(null);
        setTooltip(prev => ({ ...prev, show: false }));
      });

  }, [probabilities]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: 'transparent' }}>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: '220px', height: 'auto', backgroundColor: 'transparent' }} />

      {tooltip.show && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 15,
          top: tooltip.y - 15,
          backgroundColor: '#164043',
          color: '#f8fafc',
          padding: '8px 12px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 1000,
          width: '140px',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          transform: 'translateY(-50%)',
          borderLeft: `4px solid ${tooltip.color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tooltip.color }} />
            <span style={{ fontWeight: 800, fontSize: '12px' }}>{tooltip.zone} Chance</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '4px' }}>
            {(tooltip.val * 100).toFixed(1)} <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: 1.4 }}>
            {tooltip.tip}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginTop: '2px', // Reduced from 6px to save vertical space
        backgroundColor: 'transparent',
        fontSize: '11px',
        width: '100%'
      }}>
        {[
          { label: 'Safe', color: '#164043', val: probabilities[0] },
          { label: 'Caution', color: '#E65100', val: probabilities[1] },
          { label: 'Unsafe', color: '#d32f2f', val: probabilities[2] }
        ].map((item) => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: activeSlice === null || activeSlice === item.label ? 1 : 0.3,
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
            <span style={{ fontWeight: 600, color: '#164043' }}>{item.label}:</span>
            <span style={{ opacity: 0.85, color: '#475569' }}>{((item.val || 0) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}