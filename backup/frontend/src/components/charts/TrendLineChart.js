import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TrendLineChart({ data }) {
    const ref = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;
        d3.select(ref.current).selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = 500 - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;

        const svg = d3.select(ref.current)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([0, 23]).range([0, width]);
        svg.append('g').attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(12).tickFormat(d => `${d}:00`));

        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.pm25_level) + 10]).range([height, 0]);
        svg.append('g').call(d3.axisLeft(y));

        svg.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(25)).attr('y2', y(25)).attr('stroke', '#ff9800').attr('stroke-dasharray', '5,5');
        svg.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(50)).attr('y2', y(50)).attr('stroke', '#f44336').attr('stroke-dasharray', '5,5');

        const line = d3.line().x(d => x(d.hour)).y(d => y(d.pm25_level)).curve(d3.curveMonotoneX);

        svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#0288d1').attr('stroke-width', 3).attr('d', line);

        const tooltip = d3.select("body").append("div")
            .style("position", "absolute").style("background", "#0277bd").style("color", "#fff")
            .style("padding", "5px 10px").style("border-radius", "4px").style("font-size", "12px")
            .style("pointer-events", "none").style("opacity", 0);

        svg.selectAll('.dot').data(data).enter().append('circle')
            .attr('cx', d => x(d.hour)).attr('cy', d => y(d.pm25_level)).attr('r', 4)
            .attr('fill', d => d.prediction === 0 ? '#4caf50' : d.prediction === 1 ? '#ff9800' : '#f44336')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('r', 7);
                tooltip.style("opacity", 1).html(`Hour: ${d.hour}:00<br/>PM2.5: ${d.pm25_level}<br/>Status: ${d.label}`)
                    .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', 4);
                tooltip.style("opacity", 0);
            });

        return () => { tooltip.remove(); };
    }, [data]);

    return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }}></div>;
}