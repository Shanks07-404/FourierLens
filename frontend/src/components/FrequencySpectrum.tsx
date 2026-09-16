import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { BarChart3, ArrowDownWideNarrow, SlidersHorizontal } from 'lucide-react';
import { EpicycleItem } from '../api/socket';

interface FrequencySpectrumProps {
  epicycles: EpicycleItem[];
  numTerms: number;
  width?: number;
  height?: number;
}

export const FrequencySpectrum: React.FC<FrequencySpectrumProps> = ({
  epicycles,
  numTerms,
  width = 820,
  height = 160,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<'magnitude' | 'frequency'>('magnitude');

  useEffect(() => {
    if (!svgRef.current || epicycles.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Prepare data
    let data = epicycles.slice(0, Math.min(60, epicycles.length)).map((d, index) => ({
      ...d,
      rank: index,
      isActive: index < numTerms,
    }));

    if (sortBy === 'frequency') {
      data = [...data].sort((a, b) => a.frequency - b.frequency);
    }

    const margin = { top: 12, right: 16, bottom: 26, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.2);

    // Y Scale
    const maxRadius = d3.max(data, (d) => d.radius) || 1;
    const y = d3.scaleLinear().domain([0, maxRadius * 1.05]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(3)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#1B2A3A')
      .attr('stroke-dasharray', '2,2');

    g.select('.domain').remove();

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickSize(4))
      .selectAll('text')
      .attr('fill', '#7F93A6')
      .attr('font-size', '10px')
      .attr('font-family', 'IBM Plex Mono');

    g.selectAll('.domain').attr('stroke', '#22364B');

    // Tooltip handler
    const tooltip = d3.select(tooltipRef.current);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => x(i.toString()) || 0)
      .attr('y', (d) => y(d.radius))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.radius))
      .attr('fill', (d) =>
        d.isActive ? '#5CE6B0' : 'rgba(127, 147, 166, 0.25)'
      )
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        tooltip
          .style('opacity', 1)
          .html(
            `<div><strong style="color: #5CE6B0;">Freq k: ${d.frequency}</strong></div>` +
              `<div>Radius: ${d.radius.toFixed(2)}</div>` +
              `<div>Phase: ${(d.phase * (180 / Math.PI)).toFixed(1)}°</div>` +
              `<div>Status: ${d.isActive ? 'Active' : 'Truncated'}</div>`
          );
      })
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        tooltip
          .style('left', `${mx + 15}px`)
          .style('top', `${my - 20}px`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0);
      });

    // X Axis ticks
    const stepLabels = Math.max(1, Math.floor(data.length / 10));
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x).tickFormat((d, i) => {
          if (i % stepLabels === 0) {
            return sortBy === 'frequency'
              ? `${data[i].frequency}`
              : `#${data[i].rank + 1}`;
          }
          return '';
        })
      )
      .selectAll('text')
      .attr('fill', '#7F93A6')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono');

    g.selectAll('.domain').attr('stroke', '#22364B');
  }, [epicycles, numTerms, sortBy, width, height]);

  return (
    <div className="bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-osc-green" />
          <span className="font-serif font-semibold text-sm text-osc-text tracking-wide">
            Frequency Magnitude Spectrum (|c_k|)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy(sortBy === 'magnitude' ? 'frequency' : 'magnitude')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid transition-colors"
          >
            {sortBy === 'magnitude' ? (
              <>
                <ArrowDownWideNarrow className="w-3 h-3 text-osc-green" /> By Radius
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3 h-3 text-osc-green" /> By Frequency
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
        />

        {/* Hover Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 transition-opacity bg-osc-bg border border-osc-grid rounded p-2 text-xs font-mono text-osc-text shadow-xl z-20"
          style={{ minWidth: '110px' }}
        />
      </div>
    </div>
  );
};
