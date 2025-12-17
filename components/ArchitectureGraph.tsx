import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ARCHITECTURE_TREE_DATA } from '../constants';
import { PhaseNode } from '../types';

export const ArchitectureGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;
    
    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(100,0)"); // Left margin

    const root = d3.hierarchy<PhaseNode>(ARCHITECTURE_TREE_DATA);
    
    const treeLayout = d3.tree<PhaseNode>()
      .size([height - 100, width - 300]); // Height, Width (leaving space for labels)

    treeLayout(root);

    // Links
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any
      );

    // Nodes
    const nodes = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    // Node Circles
    nodes.append('circle')
      .attr('r', 8)
      .attr('fill', (d) => d.depth === 0 ? '#4ade80' : d.depth === 1 ? '#fbbf24' : '#0f172a')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2);

    // Node Labels
    nodes.append('text')
      .attr('dy', '.35em')
      .attr('x', (d) => d.children ? -15 : 15)
      .attr('text-anchor', (d) => d.children ? 'end' : 'start')
      .text((d) => d.data.name)
      .style('fill', '#f8fafc')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('font-weight', (d) => d.depth === 0 ? 'bold' : 'normal');

  }, []);

  return (
    <div className="bg-sentry-card rounded-lg p-4 shadow-lg border border-slate-700 h-full flex flex-col">
      <h2 className="text-xl font-bold text-sentry-accent mb-4">SENTRY Architecture Hierarchical View</h2>
      <div ref={containerRef} className="flex-grow overflow-auto">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};