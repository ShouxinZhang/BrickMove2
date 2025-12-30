"use client";

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TreeNode } from '@/types';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Focus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Point {
  x: number;
  y: number;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  node: TreeNode;
}

interface GraphRendererProps {
  root: TreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const GraphRenderer: React.FC<GraphRendererProps> = ({ root, selectedId, onSelect }) => {
  const NODE_RADIUS = 24;
  const LEVEL_HEIGHT = 120;
  const MIN_GAP = 80;

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);
  
  // Motion values for panning
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const { layoutNodes, connections, width, height } = useMemo(() => {
    const nodes: LayoutNode[] = [];
    const lines: { from: Point; to: Point }[] = [];
    let currentX = 0;

    function layout(node: TreeNode, depth: number): number {
      const nodeY = depth * LEVEL_HEIGHT;
      let nodeX: number;

      if (node.children.length === 0) {
        nodeX = currentX;
        currentX += MIN_GAP;
      } else {
        const childXs = node.children.map((child) => layout(child, depth + 1));
        nodeX = (childXs[0] + childXs[childXs.length - 1]) / 2;

        childXs.forEach((childX) => {
          lines.push({
            from: { x: nodeX, y: nodeY },
            to: { x: childX, y: (depth + 1) * LEVEL_HEIGHT },
          });
        });
      }

      nodes.push({ id: node.id, x: nodeX, y: nodeY, node });
      return nodeX;
    }

    layout(root, 0);

    // Calculate bounds
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y));

    const w = maxX - minX + NODE_RADIUS * 4;
    const h = maxY - minY + NODE_RADIUS * 4;

    // Offset nodes to be relative to 0,0 with padding
    const offsetNodes = nodes.map(n => ({
        ...n,
        x: n.x - minX + NODE_RADIUS * 2,
        y: n.y - minY + NODE_RADIUS * 2
    }));

    const offsetLines = lines.map(l => ({
        from: { x: l.from.x - minX + NODE_RADIUS * 2, y: l.from.y - minY + NODE_RADIUS * 2 },
        to: { x: l.to.x - minX + NODE_RADIUS * 2, y: l.to.y - minY + NODE_RADIUS * 2 }
    }));

    return { layoutNodes: offsetNodes, connections: offsetLines, width: w, height: h };
  }, [root]);

  // Center the tree on mount or when root changes
  const handleResetPosition = () => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      x.set((offsetWidth - width) / 2);
      y.set(50);
    }
  };

  useEffect(() => {
    if (initializedRef.current !== root.id) {
      handleResetPosition();
      initializedRef.current = root.id;
    }
  }, [root.id, width, height]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-50 rounded-xl border border-gray-200 shadow-inner cursor-grab active:cursor-grabbing"
    >
      <motion.div 
        drag 
        dragMomentum={false}
        style={{ x, y }} 
        className="absolute"
      >
        <div className="relative" style={{ width, height }}>
          <svg width={width} height={height} overflow="visible" className="overflow-visible">
            {/* Connections */}
            {connections.map((line, i) => (
              <line
                key={i}
                x1={line.from.x}
                y1={line.from.y}
                x2={line.to.x}
                y2={line.to.y}
                stroke="#cbd5e1"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Nodes */}
            {layoutNodes.map((ln) => (
              <g
                key={ln.id}
                transform={`translate(${ln.x}, ${ln.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(ln.id);
                }}
                onMouseEnter={() => setHoveredId(ln.id)}
                onMouseLeave={() => setHoveredId((prev) => (prev === ln.id ? null : prev))}
                className="cursor-pointer"
              >
                <circle
                  r={NODE_RADIUS}
                  fill={selectedId === ln.id ? '#4f46e5' : 'white'}
                  stroke={selectedId === ln.id ? '#4f46e5' : '#64748b'}
                  strokeWidth="2.5"
                  className="transition-all duration-200 hover:stroke-indigo-400 shadow-sm"
                />

                {/* Leaf indicator */}
                {ln.node.children.length === 0 && (
                  <circle r="5" fill={selectedId === ln.id ? 'white' : '#4f46e5'} />
                )}
              </g>
            ))}
          </svg>

          {/* Hover tooltip overlay (HTML) */}
          {hoveredId && (() => {
            const hovered = layoutNodes.find((n) => n.id === hoveredId);
            if (!hovered) return null;

            const TOOLTIP_WIDTH = 340;
            const GAP = 14;
            // Flip if node is near the top of the viewport/container
            const showAbove = hovered.y > 250;

            return (
              <div
                className="absolute pointer-events-none z-50"
                style={{
                  left: hovered.x,
                  top: hovered.y,
                  width: TOOLTIP_WIDTH,
                  transform: showAbove 
                    ? `translate(-50%, calc(-100% - ${NODE_RADIUS + GAP}px))` 
                    : `translate(-50%, ${NODE_RADIUS + GAP}px)`,
                }}
              >
                <div className="relative w-full rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-xl">
                  <div className="p-3 text-[12px] leading-relaxed text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {hovered.node.statement?.trim() ? hovered.node.statement : '*Empty*'}
                    </ReactMarkdown>

                    {hovered.node.apis?.length > 0 && (
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <div className="text-[10px] font-semibold text-slate-500">Lean4 APIs</div>
                        <ul className="mt-1 space-y-1">
                          {hovered.node.apis.slice(0, 6).map((api, idx) => {
                            const name = typeof api === 'string' ? api : api.name;
                            const points = typeof api === 'string' ? 1 : api.points;
                            return (
                              <li key={idx} className="flex items-center justify-between gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <span className="font-mono text-[10px] text-slate-900 truncate">
                                  {name || '(empty)'}
                                </span>
                                <span className={`shrink-0 text-[9px] font-bold px-1 rounded ${
                                  points === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {points}pt
                                </span>
                              </li>
                            );
                          })}
                          {hovered.node.apis.length > 6 && (
                            <li className="text-[10px] text-slate-500 pl-2">…and {hovered.node.apis.length - 6} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  {showAbove ? (
                    <div className="absolute left-1/2 top-full -translate-x-1/2">
                      <div className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-white" />
                      <div className="-mt-[10px] h-0 w-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-200 opacity-60" />
                    </div>
                  ) : (
                    <div className="absolute left-1/2 bottom-full -translate-x-1/2">
                      <div className="h-0 w-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-white" />
                      <div className="mt-[10px] h-0 w-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-slate-200 opacity-60" />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Controls Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none">
        <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 text-[10px] text-slate-500 font-medium">
          Drag to pan • Click node to edit
        </div>
      </div>

      <button
        onClick={handleResetPosition}
        className="absolute bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg z-30 group flex items-center justify-center"
        title="Reset View"
      >
        <Focus size={20} className="group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};
