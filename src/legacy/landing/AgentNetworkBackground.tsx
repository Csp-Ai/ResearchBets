'use client';

import { motion, useReducedMotion } from 'framer-motion';

type AgentNetworkBackgroundProps = {
  active?: boolean;
};

const nodes: Array<{ id: string; x: number; y: number; core?: boolean }> = [
  { id: 'InjuryScout', x: 14, y: 20 },
  { id: 'LineWatcher', x: 35, y: 72 },
  { id: 'StatCruncher', x: 48, y: 38 },
  { id: 'VolatilityModel', x: 70, y: 66 },
  { id: 'VerdictEngine', x: 88, y: 30, core: true }
];

const edges: Array<{ from: string; to: string }> = [
  { from: 'InjuryScout', to: 'StatCruncher' },
  { from: 'LineWatcher', to: 'StatCruncher' },
  { from: 'StatCruncher', to: 'VolatilityModel' },
  { from: 'VolatilityModel', to: 'VerdictEngine' },
  { from: 'StatCruncher', to: 'VerdictEngine' }
];

const getNode = (id: string) => nodes.find((node) => node.id === id);

export function AgentNetworkBackground({ active = false }: AgentNetworkBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      animate={{ opacity: active && !shouldReduceMotion ? 0.3 : 0.14 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {edges.map((edge) => {
          const start = getNode(edge.from);
          const end = getNode(edge.to);

          if (!start || !end) {
            return null;
          }

          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={active ? 'rgba(34, 211, 238, 0.42)' : 'rgba(45, 212, 191, 0.32)'}
                strokeWidth="0.42"
              />
              {!shouldReduceMotion ? (
                <motion.circle
                  cx={start.x}
                  cy={start.y}
                  r="0.7"
                  fill="rgba(34, 211, 238, 0.9)"
                  animate={{ cx: [start.x, end.x], cy: [start.y, end.y], opacity: active ? [0, 1, 0.1] : [0, 0.9, 0] }}
                  transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
                />
              ) : null}
            </g>
          );
        })}

        {nodes.map((node, index) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.core ? '2.5' : '2'}
              fill={node.core ? 'rgba(34, 211, 238, 0.55)' : 'rgba(148, 163, 184, 0.4)'}
              stroke={node.core ? 'rgba(34, 211, 238, 0.9)' : 'rgba(148, 163, 184, 0.7)'}
              strokeWidth="0.5"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: node.core ? (active ? [0.8, 1, 0.82] : [0.7, 1, 0.7]) : active ? [0.5, 0.76, 0.52] : [0.45, 0.7, 0.45],
                      scale: node.core ? [1, 1.05, 1] : [1, 1.02, 1]
                    }
              }
              transition={{
                duration: node.core ? 3.8 : 4.8,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: index * 0.3
              }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
