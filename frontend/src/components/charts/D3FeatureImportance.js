import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const FEATURE_DESCRIPTIONS = {
  LUDD_RH: 'Relative Humidity (29.8%): High moisture traps particulate matter in the lower atmosphere.',
  LUDD_T: 'Temperature (20.5%): Thermal inversions restrict vertical dispersion, causing particulate spikes.',
  LUDD_p: 'Barometric Pressure (16.2%): High pressure systems create stable air masses where pollutants accumulate.',
  LUDD_wd: 'Wind Direction (9.2%): Determines transport corridors from industrial or bushfire hazard zones.',
  Hour: 'Hour of Day (8.6%): Captures diurnal commuter traffic pulses and photochemical reactions.',
  DayOfWeek: 'Day of Week (8.4%): Differentiates high-traffic school/workdays from weekend patterns.',
  LUDD_ws: 'Wind Speed (6.8%): High wind speeds disperse pollutants; calm air causes stagnation.',
  Is_Holiday: 'Public Holiday (0.5%): Accounts for decreased school bus and local traffic emissions.',
  LUDD_Rain: 'Rainfall (0.1%): Scavenges and cleans particulate matter from ambient air.'
};

const FRIENDLY_NAMES = {
  LUDD_RH: 'Relative Humidity',
  LUDD_T: 'Temperature',
  LUDD_p: 'Barometric Pressure',
  LUDD_wd: 'Wind Direction',
  Hour: 'Time of Day (Hour)',
  DayOfWeek: 'Day of Week',
  LUDD_ws: 'Wind Speed',
  Is_Holiday: 'Public Holiday',
  LUDD_Rain: 'Precipitation (Rain)'
};

// Static default fallback data to ensure stable references across re-renders
const DEFAULT_DATA = {
  LUDD_RH: 0.2976,
  LUDD_T: 0.2051,
  LUDD_p: 0.1621,
  LUDD_wd: 0.0917,
  Hour: 0.0862,
  DayOfWeek: 0.0843,
  LUDD_ws: 0.0677,
  Is_Holiday: 0.0048,
  LUDD_Rain: 0.0005
};

export default function D3FeatureImportance({ data, darkMode = false }) {
  const svgRef = useRef(null);
  const [sortBy, setSortBy] = useState('importance'); // 'importance' or 'name'
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const currentData = useMemo(() => {
    return data && Object.keys(data).length > 0 ? data : DEFAULT_DATA;
  }, [data]);

  const items = useMemo(() => {
    const list = Object.keys(currentData).map((key) => ({
      feature: key,
      name: FRIENDLY_NAMES[key] || key,
      value: currentData[key],
      desc: FEATURE_DESCRIPTIONS[key] || ''
    }));

    if (sortBy === 'importance') {
      list.sort((a, b) => b.value - a.value);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [currentData, sortBy]);

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 15, right: 55, bottom: 35, left: 145 };
    const width = 560;
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

    const x = d3.scaleLinear()
      .domain([0, 0.35])
      .range([0, innerWidth]);

    const y = d3.scaleBand()
      .domain(items.map(d => d.feature))
      .range([0, innerHeight])
      .padding(0.24);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickSize(-innerHeight)
          .tickFormat('')
      )
      .attr('stroke-opacity', 0.1)
      .attr('color', darkMode ? '#94a3b8' : '#cbd5e1');

    // Gradient definition
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'barGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#2563eb');

    const bars = g.selectAll('rect')
      .data(items, d => d.feature)
      .enter()
      .append('rect')
      .attr('y', d => y(d.feature))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('rx', 4)
      .attr('fill', 'url(#barGrad)')
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.15s ease');

    // Bar enter animation
    bars.transition()
      .duration(700)
      .delay((_, i) => i * 30)
      .attr('width', d => x(d.value));

    // Value percentage labels
    g.selectAll('.val-label')
      .data(items, d => d.feature)
      .enter()
      .append('text')
      .attr('class', 'val-label')
      .attr('x', d => x(d.value) + 8)
      .attr('y', d => y(d.feature) + y.bandwidth() / 2 + 4)
      .attr('fill', darkMode ? '#f1f5f9' : '#0f172a')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => `${(d.value * 100).toFixed(1)}%`);

    // Y Axis labels
    const yAxis = g.append('g')
      .call(d3.axisLeft(y).tickFormat(f => FRIENDLY_NAMES[f] || f));

    yAxis.selectAll('text')
      .attr('fill', darkMode ? '#cbd5e1' : '#334155')
      .attr('font-size', '11px')
      .attr('font-weight', '600');

    yAxis.select('.domain').attr('color', darkMode ? '#475569' : '#cbd5e1');

    // X Axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`));

    xAxis.selectAll('text')
      .attr('fill', darkMode ? '#94a3b8' : '#64748b')
      .attr('font-size', '11px');

    xAxis.select('.domain').attr('color', darkMode ? '#475569' : '#cbd5e1');

    // Non-shuttering hover handlers
    const handleSelect = function (_, d) {
      bars.attr('opacity', 0.65).attr('fill', 'url(#barGrad)');
      d3.select(this)
        .raise()
        .attr('opacity', 1)
        .attr('fill', '#1d4ed8');
      setHoveredFeature(d);
    };

    const handleDeselect = function () {
      bars.attr('opacity', 1).attr('fill', 'url(#barGrad)');
      setHoveredFeature(null);
    };

    bars
      .on('mouseenter', handleSelect)
      .on('touchstart', handleSelect)
      .on('click', handleSelect)
      .on('mouseleave', handleDeselect);

  }, [items, darkMode]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
          Gini feature importance (100-tree Random Forest)
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setSortBy('importance')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: sortBy === 'importance' ? '#2563eb' : 'transparent',
              color: sortBy === 'importance' ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
              cursor: 'pointer',
              minHeight: '30px'
            }}
          >
            Sort by Impact
          </button>
          <button
            onClick={() => setSortBy('name')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: sortBy === 'name' ? '#2563eb' : 'transparent',
              color: sortBy === 'name' ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
              cursor: 'pointer',
              minHeight: '30px'
            }}
          >
            Alphabetical
          </button>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Stable minHeight container to completely prevent vertical displacement when displaying details */}
      <div style={{ minHeight: '52px', marginTop: '8px' }}>
        {hoveredFeature ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: darkMode ? '#1e293b' : '#eff6ff',
              border: '1px solid #93c5fd',
              fontSize: '12px',
              color: darkMode ? '#bfdbfe' : '#1e3a8a'
            }}
          >
            <strong>{hoveredFeature.name}:</strong> {hoveredFeature.desc}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: darkMode ? '#64748b' : '#94a3b8', fontStyle: 'italic', paddingTop: '6px' }}>
            Tip: Tap or hover over any bar to view its atmospheric rationale.
          </div>
        )}
      </div>
    </div>
  );
}
