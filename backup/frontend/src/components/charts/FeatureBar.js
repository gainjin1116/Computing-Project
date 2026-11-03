import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function FeatureBar({ data }) {
    const ref = useRef();

    useEffect(() => {
        if (!data || Object.keys(data).length === 0) return;

        d3.select(ref.current).selectAll('*').remove();

        const width = 400;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 40, left: 100 };

        // Convert object to array and sort
        const parsedData = Object.keys(data).map(key => ({
            feature: key, value: data[key]
        })).sort((a, b) => b.value - a.value);

        const svg = d3.select(ref.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, d3.max(parsedData, d => d.value)])
            .range([0, width - margin.left - margin.right]);

        const y = d3.scaleBand()
            .domain(parsedData.map(d => d.feature))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.2);

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5));

        // Y Axis
        svg.append('g')
            .call(d3.axisLeft(y));

        // Bars
        svg.selectAll('rect')
            .data(parsedData)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', d => y(d.feature))
            .attr('width', d => x(d.value))
            .attr('height', y.bandwidth())
            .attr('fill', '#2196f3')
            .on('mouseover', function () { d3.select(this).attr('fill', '#1565c0'); })
            .on('mouseout', function () { d3.select(this).attr('fill', '#2196f3'); });

    }, [data]);

    return <div ref={ref}></div>;
}