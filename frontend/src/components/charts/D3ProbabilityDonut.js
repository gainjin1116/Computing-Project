import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function D3ProbabilityDonut({ probabilities = [0.85, 0.12, 0.03], darkMode = false }) {
  const svgRef = useRef(null);
  const [activeSlice, setActiveSlice] = useState(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 280;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 16;
    const innerRadius = radius * 0.62;

    const data = [
      { label: 'Safe', value: probabilities[0] || 0, color: '#2e7d32' },
      { label: 'Caution', value: probabilities[1] || 0, color: '#ed6c02' },
      { label: 'Unsafe', value: probabilities[2] || 0, color: '#d32f2f' }
    ];

    const maxEntry = data.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), data[0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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
      .outerRadius(radius + 7)
      .cornerRadius(4)
      .padAngle(0.03);

    const paths = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('fill', (d) => d.data.color)
      .attr('stroke', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'transform 0.25s ease')
      .each(function (d) {
        this._current = d;
      });

    // Enter animation
    paths.transition()
      .duration(750)
      .attrTween('d', function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t));
        };
      });

    // Hover events
    paths
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc);
        setActiveSlice(d.data);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
        setActiveSlice(null);
      });

    // Center display
    const centerDisplay = activeSlice || maxEntry;

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('fill', darkMode ? '#f8fafc' : '#0f172a')
      .attr('font-size', '24px')
      .attr('font-weight', '800')
      .text(`${(centerDisplay.value * 100).toFixed(1)}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', centerDisplay.color)
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .text(centerDisplay.label);

  }, [probabilities, activeSlice, darkMode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: '280px', height: 'auto' }} />
      <div style={{ display: 'flex', gap: '14px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Safe', color: '#2e7d32', val: probabilities[0] },
          { label: 'Caution', color: '#ed6c02', val: probabilities[1] },
          { label: 'Unsafe', color: '#d32f2f', val: probabilities[2] }
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
            <span style={{ fontWeight: 600 }}>{item.label}:</span>
            <span style={{ opacity: 0.85 }}>{((item.val || 0) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
