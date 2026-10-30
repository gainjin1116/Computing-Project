import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function GaugeChart({ value }) {
    const ref = useRef();
    useEffect(() => {
        if (value === undefined) return;
        d3.select(ref.current).selectAll('*').remove();

        const width = 300, height = 200;
        const svg = d3.select(ref.current).append('svg')
            .attr('width', width).attr('height', height)
            .append('g').attr('transform', `translate(${width / 2},${height * 0.8})`);

        const scale = d3.scaleLinear().domain([0, 100]).range([-Math.PI / 2, Math.PI / 2]);

        svg.append('path').attr('d', d3.arc().innerRadius(70).outerRadius(100).startAngle(-Math.PI / 2).endAngle(Math.PI / 2)()).attr('fill', '#e0e0e0');
        svg.append('path').attr('d', d3.arc().innerRadius(70).outerRadius(100).startAngle(-Math.PI / 2).endAngle(scale(25))()).attr('fill', '#4caf50');
        svg.append('path').attr('d', d3.arc().innerRadius(70).outerRadius(100).startAngle(scale(25)).endAngle(scale(50))()).attr('fill', '#ff9800');
        svg.append('path').attr('d', d3.arc().innerRadius(70).outerRadius(100).startAngle(scale(50)).endAngle(Math.PI / 2)()).attr('fill', '#f44336');

        svg.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', -85).attr('stroke', 'black').attr('stroke-width', 3)
            .attr('transform', `rotate(${scale(value) * 180 / Math.PI})`);

        svg.append('circle').attr('r', 6).attr('fill', 'black');
        svg.append('text').attr('text-anchor', 'middle').attr('y', 25).style('font-size', '16px').style('font-weight', 'bold').text(`PM2.5: ${value}`);
    }, [value]);

    return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }}></div>;
}