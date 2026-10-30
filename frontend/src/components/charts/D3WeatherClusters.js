import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function D3WeatherClusters({ darkMode = false }) {
  const svgRef = useRef(null);
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Representative synthetic sample mirroring the 3 clusters identified in Assignment 2 report
  const clusterData = [
    // Cluster 0: Stagnant Inversion (Warm & Humid / Low Wind) -> Elevated PM2.5 (Caution/Unsafe)
    { id: 1, temp: 34.2, rh: 82, pm25: 58.4, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 0.8 },
    { id: 2, temp: 36.5, rh: 78, pm25: 64.1, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 1.1 },
    { id: 3, temp: 31.0, rh: 88, pm25: 48.2, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 1.5 },
    { id: 4, temp: 32.8, rh: 75, pm25: 52.0, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 1.2 },
    { id: 5, temp: 29.5, rh: 84, pm25: 41.5, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 1.8 },
    { id: 6, temp: 35.1, rh: 86, pm25: 68.3, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 0.7 },
    { id: 7, temp: 33.4, rh: 79, pm25: 55.7, cluster: 0, name: 'Cluster 0: Stagnant Inversion', ws: 0.9 },

    // Cluster 1: Marine Breeze / Moderate Dispersal -> Low PM2.5 (Safe)
    { id: 8, temp: 21.4, rh: 62, pm25: 11.2, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 6.5 },
    { id: 9, temp: 19.8, rh: 55, pm25: 8.7, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 8.2 },
    { id: 10, temp: 24.1, rh: 58, pm25: 14.5, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 5.9 },
    { id: 11, temp: 18.5, rh: 65, pm25: 9.8, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 7.4 },
    { id: 12, temp: 22.9, rh: 50, pm25: 12.3, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 6.8 },
    { id: 13, temp: 25.3, rh: 48, pm25: 16.1, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 5.2 },
    { id: 14, temp: 20.2, rh: 60, pm25: 10.4, cluster: 1, name: 'Cluster 1: Dispersive Marine', ws: 7.1 },

    // Cluster 2: Rainy / Wet Scavenging -> Very Low PM2.5 (Safe)
    { id: 15, temp: 16.2, rh: 94, pm25: 4.2, cluster: 2, name: 'Cluster 2: Wet Scavenging', ws: 4.8 },
    { id: 16, temp: 15.0, rh: 96, pm25: 3.5, cluster: 2, name: 'Cluster 2: Wet Scavenging', ws: 5.5 },
    { id: 17, temp: 17.8, rh: 91, pm25: 5.8, cluster: 2, name: 'Cluster 2: Wet Scavenging', ws: 4.2 },
    { id: 18, temp: 14.5, rh: 98, pm25: 2.9, cluster: 2, name: 'Cluster 2: Wet Scavenging', ws: 6.0 },
    { id: 19, temp: 18.2, rh: 89, pm25: 6.1, cluster: 2, name: 'Cluster 2: Wet Scavenging', ws: 3.9 }
  ];

  const filteredData = selectedCluster === 'all'
    ? clusterData
    : clusterData.filter(d => d.cluster === Number(selectedCluster));

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 560;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 45, left: 55 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([10, 42]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([40, 105]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-innerHeight).tickFormat(''))
      .attr('stroke-opacity', 0.1)
      .attr('color', darkMode ? '#94a3b8' : '#cbd5e1');

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(''))
      .attr('stroke-opacity', 0.1)
      .attr('color', darkMode ? '#94a3b8' : '#cbd5e1');

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => `${d}°C`);
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px');

    g.append('g')
      .call(yAxis)
      .attr('color', darkMode ? '#94a3b8' : '#64748b')
      .selectAll('text').attr('font-size', '11px');

    // Labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 36)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#cbd5e1' : '#475569')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('Ambient Temperature (°C)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -38)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#cbd5e1' : '#475569')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('Relative Humidity (%)');

    // Colors for clusters
    const clusterColors = ['#ef4444', '#3b82f6', '#10b981'];

    // Points with opacity and blend mode to show overlapping data density
    const circles = g.selectAll('circle')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.temp))
      .attr('cy', d => y(d.rh))
      .attr('r', 0)
      .attr('fill', d => clusterColors[d.cluster])
      .attr('stroke', d => clusterColors[d.cluster])
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.55)
      .style('mix-blend-mode', darkMode ? 'screen' : 'multiply')
      .style('cursor', 'pointer');

    circles.transition()
      .duration(700)
      .delay((_, i) => i * 30)
      .attr('r', d => Math.max(7, Math.min(15, d.pm25 / 4.2)));

    circles
      .on('mouseenter', function (_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 18)
          .attr('opacity', 0.95);
        setHoveredPoint(d);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', Math.max(7, Math.min(15, d.pm25 / 4.2)))
          .attr('opacity', 0.55);
        setHoveredPoint(null);
      });

  }, [filteredData, darkMode]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b' }}>
          Unsupervised K-Means (k=3, Silhouette: 0.265) grouping atmospheric profiles
        </div>
        <div>
          {['all', 0, 1, 2].map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedCluster(String(opt))}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: selectedCluster === String(opt) ? '#2563eb' : 'transparent',
                color: selectedCluster === String(opt) ? '#fff' : darkMode ? '#e2e8f0' : '#334155',
                cursor: 'pointer',
                marginRight: '4px'
              }}
            >
              {opt === 'all' ? 'All Clusters' : `Cluster ${opt}`}
            </button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />

      {hoveredPoint ? (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          <span><strong>Profile:</strong> {hoveredPoint.name}</span>
          <span><strong>Temp:</strong> {hoveredPoint.temp}°C</span>
          <span><strong>Humidity:</strong> {hoveredPoint.rh}%</span>
          <span><strong>Wind:</strong> {hoveredPoint.ws} m/s</span>
          <span>
            <strong>PM2.5:</strong>{' '}
            <span style={{ color: hoveredPoint.pm25 <= 25 ? '#2e7d32' : hoveredPoint.pm25 <= 50 ? '#ed6c02' : '#d32f2f', fontWeight: 700 }}>
              {hoveredPoint.pm25} µg/m³
            </span>
          </span>
        </div>
      ) : (
        <div style={{ marginTop: '8px', fontSize: '12px', color: darkMode ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
          Bubble radius represents PM2.5 concentration. Overlapping regions darken to visualize spatial density.
        </div>
      )}
    </div>
  );
}
