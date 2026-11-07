import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const FEATURE_DESCRIPTIONS = {
  LUDD_RH: 'Relative Humidity: High moisture traps particulate matter in the lower atmosphere.',
  LUDD_T: 'Temperature: Thermal inversions restrict vertical dispersion, causing particulate spikes.',
  LUDD_p: 'Barometric Pressure: High pressure systems create stable air masses where pollutants accumulate.',
  LUDD_wd: 'Wind Direction: Determines transport corridors from industrial or bushfire hazard zones.',
  Hour: 'Hour of Day: Captures diurnal commuter traffic pulses and photochemical reactions.',
  DayOfWeek: 'Day of Week: Differentiates high-traffic school/workdays from weekend patterns.',
  LUDD_ws: 'Wind Speed: High wind speeds disperse pollutants; calm air causes stagnation.',
  Is_Holiday: 'Public Holiday: Accounts for decreased school bus and local traffic emissions.',
  LUDD_Rain: 'Rainfall: Scavenges and cleans particulate matter from ambient air.'
};

const FRIENDLY_NAMES = {
  LUDD_RH: 'Relative Humidity',
  LUDD_T: 'Temperature',
  LUDD_p: 'Barometric Pressure',
  LUDD_wd: 'Wind Direction',
  Hour: 'Time of Day',
  DayOfWeek: 'Day of Week',
  LUDD_ws: 'Wind Speed',
  Is_Holiday: 'Public Holiday',
  LUDD_Rain: 'Precipitation'
};

export default function D3FeatureImportance({ data }) {
  const svgRef = useRef(null);

  const defaultData = {
    LUDD_RH: 0.2976, LUDD_T: 0.2051, LUDD_p: 0.1621, LUDD_wd: 0.0917,
    Hour: 0.0862, DayOfWeek: 0.0843, LUDD_ws: 0.0677, Is_Holiday: 0.0048, LUDD_Rain: 0.0005
  };

  const currentData = data && Object.keys(data).length > 0 ? data : defaultData;

  useEffect(() => {
    if (!svgRef.current) return;

    let items = Object.keys(currentData).map((key) => ({
      feature: key,
      name: FRIENDLY_NAMES[key] || key,
      value: currentData[key],
      desc: FEATURE_DESCRIPTIONS[key] || ''
    }));

    items.sort((a, b) => b.value - a.value);

    const margin = { top: 10, right: 50, bottom: 30, left: 140 };
    const width = 560;
    const height = 300;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 0.5]).range([0, innerWidth]); // Extended domain to fit 48.2%
    const y = d3.scaleBand().domain(items.map(d => d.feature)).range([0, innerHeight]).padding(0.3);

    // Gridlines
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-innerHeight).tickFormat(''))
      .attr('stroke-opacity', 0.05)
      .attr('color', '#164043');

    // Bars with Deep Green Gradient
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'barGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#164043');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#00b894');

    const bars = g.selectAll('rect')
      .data(items)
      .enter()
      .append('rect')
      .attr('y', d => y(d.feature))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('rx', 6)
      .attr('fill', 'url(#barGrad)')
      .style('cursor', 'pointer');

    // Bar animation
    bars.transition().duration(800).delay((_, i) => i * 40).attr('width', d => x(d.value));

    // Value labels (Dynamic positioning based on bar length)
    g.selectAll('.val-label')
      .data(items)
      .enter()
      .append('text')
      .attr('class', 'val-label')
      .attr('x', d => {
        // If bar is longer than 40%, put text inside the bar; otherwise outside.
        if (d.value >= 0.40) {
          return x(d.value) - 10; // Padding inside the right edge
        }
        return x(d.value) + 10; // Padding outside the right edge
      })
      .attr('y', d => y(d.feature) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', d => d.value >= 0.40 ? 'end' : 'start') // Right align if inside
      .attr('fill', d => d.value >= 0.40 ? '#ffffff' : '#475569') // White text if inside bar
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => `${(d.value * 100).toFixed(1)}%`);

    // Y Axis
    const yAxis = g.append('g').call(d3.axisLeft(y).tickFormat(f => FRIENDLY_NAMES[f] || f));
    yAxis.selectAll('text').attr('fill', '#164043').attr('font-size', '12px').attr('font-weight', '700');
    yAxis.select('.domain').attr('color', '#e2e8f0');

    // X Axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).tickValues([0, 0.1, 0.2, 0.3, 0.4, 0.5]).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .call(g => g.select('.domain').attr('x2', innerWidth));
    xAxis.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px');
    xAxis.select('.domain').attr('color', '#e2e8f0');

    // --- D3 Native HTML Tooltip with Smart Positioning ---
    const tooltip = d3.select('body').append('div')
      .style('position', 'absolute')
      .style('background-color', '#164043')
      .style('color', '#f8fafc')
      .style('padding', '10px 14px')
      .style('border-radius', '10px')
      .style('box-shadow', '0 8px 24px rgba(0,0,0,0.2)')
      .style('pointer-events', 'none')
      .style('z-index', '9999')
      .style('width', '220px')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s ease')
      .style('border-left', '4px solid #00b894')
      .style('font-family', "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif");

    // Hover Interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('opacity', 0.8);

        tooltip.transition().duration(150).style('opacity', 1);
        tooltip.html(`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 13px;">${d.name}</span>
            <span style="font-weight: 900; font-size: 13px; color: #00b894;">${(d.value * 100).toFixed(1)}%</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
            ${d.desc}
          </div>
        `);
      })
      .on('mousemove', function (event) {
        // Smart Positioning: Shift tooltip left if mouse is near right edge
        const tooltipWidth = 220;
        const windowWidth = window.innerWidth;

        let leftPos = event.pageX + 20; // Default right

        // If placing it on the right would go off-screen, place it on the left
        if (leftPos + tooltipWidth > windowWidth) {
          leftPos = event.pageX - tooltipWidth - 20;
        }

        tooltip
          .style('left', leftPos + 'px')
          .style('top', (event.pageY - 30) + 'px');
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('opacity', 1);
        tooltip.transition().duration(150).style('opacity', 0);
      });

    // Cleanup function
    return () => {
      tooltip.remove();
    };

  }, [currentData]);

  return (
    <div style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}