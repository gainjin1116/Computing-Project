import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ProbabilityDonut({ probabilities }) {
    const ref = useRef();

    useEffect(() => {
        if (!probabilities || probabilities.length === 0) return;

        // Clear previous chart
        d3.select(ref.current).selectAll('*').remove();

        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2;

        const data = [
            { label: 'Safe', value: probabilities[0], color: '#4caf50' },
            { label: 'Caution', value: probabilities[1], color: '#ff9800' },
            { label: 'Unsafe', value: probabilities[2], color: '#f44336' },
        ];

        const svg = d3.select(ref.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        const pie = d3.pie().value(d => d.value).sort(null);
        const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.9);

        // Draw slices
        svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white')
            .style('stroke-width', '2px')
            .style('transition', 'opacity 0.2s')
            .on('mouseover', function () { d3.select(this).style('opacity', 0.7); })
            .on('mouseout', function () { d3.select(this).style('opacity', 1); });

        // Draw text in center
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('font-size', '24px')
            .style('font-weight', 'bold')
            .text(`${(Math.max(...probabilities) * 100).toFixed(1)}%`);

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '2em')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('Confidence');
    }, [probabilities]);

    return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }}></div>;
}