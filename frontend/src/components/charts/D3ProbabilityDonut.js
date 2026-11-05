import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function D3ProbabilityDonut({ probabilities = [0.85, 0.12, 0.03], darkMode = false }) {
  const svgRef = useRef(null);

  // Normalize probabilities array to ensure stable data
  const safeProb = probabilities && probabilities.length === 3
    ? probabilities
    : [0.85, 0.12, 0.03];

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 280;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 16;
    const innerRadius = radius * 0.62;

    const data = [
      { label: 'Safe', value: safeProb[0] || 0, color: '#2e7d32' },
      { label: 'Caution', value: safeProb[1] || 0, color: '#ed6c02' },
      { label: 'Unsafe', value: safeProb[2] || 0, color: '#d32f2f' }
    ];

    const maxEntry = data.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), data[0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
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
      .outerRadius(radius + 7)
      .cornerRadius(4)
      .padAngle(0.03);

    // Center display texts
    const centerPct = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('fill', darkMode ? '#f8fafc' : '#0f172a')
      .attr('font-size', '24px')
      .attr('font-weight', '800')
      .text(`${(maxEntry.value * 100).toFixed(1)}%`);

    const centerLabel = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', maxEntry.color)
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .text(maxEntry.label);

    const paths = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('fill', (d) => d.data.color)
      .attr('stroke', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .attr('d', arc);

    // Initial smooth enter animation
    paths.transition()
      .duration(650)
      .attrTween('d', function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t));
        };
      });

    // Zero-re-render hover interactions directly updating D3 SVG elements
    const handleSelect = function (event, d) {
      paths.attr('d', arc);
      d3.select(this)
        .raise()
        .attr('d', hoverArc);

      centerPct.text(`${(d.data.value * 100).toFixed(1)}%`);
      centerLabel.text(d.data.label).attr('fill', d.data.color);
    };

    const handleDeselect = function () {
      paths.attr('d', arc);
      centerPct.text(`${(maxEntry.value * 100).toFixed(1)}%`);
      centerLabel.text(maxEntry.label).attr('fill', maxEntry.color);
    };

    paths
      .on('mouseenter', handleSelect)
      .on('touchstart', handleSelect)
      .on('click', handleSelect)
      .on('mouseleave', handleDeselect);

  }, [safeProb[0], safeProb[1], safeProb[2], darkMode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Safe', color: '#2e7d32', val: safeProb[0] },
          { label: 'Caution', color: '#ed6c02', val: safeProb[1] },
          { label: 'Unsafe', color: '#d32f2f', val: safeProb[2] }
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '4px 6px'
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: darkMode ? '#f8fafc' : '#1e293b' }}>{item.label}:</span>
            <span style={{ opacity: 0.85, color: darkMode ? '#cbd5e1' : '#475569' }}>{((item.val || 0) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
