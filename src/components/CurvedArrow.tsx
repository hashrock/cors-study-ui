import { useId } from 'react';

export type CurvedArrowDirection = 'forward' | 'backward' | 'down';

export interface CurvedArrowProps {
  direction?: CurvedArrowDirection;
  color?: string;
  strokeWidth?: number;
  animated?: boolean;
  className?: string;
}

const viewBoxes: Record<CurvedArrowDirection, string> = {
  forward: '0 0 160 80',
  backward: '0 0 160 80',
  down: '0 0 80 160',
};

const pathByDirection: Record<CurvedArrowDirection, string> = {
  forward: 'M10 40 L150 40',
  backward: 'M150 40 L10 40',
  down: 'M40 10 L40 150',
};

export function CurvedArrow({
  direction = 'forward',
  color = '#63b3ed',
  strokeWidth = 4,
  animated = true,
  className,
}: CurvedArrowProps) {
  const markerId = useId();
  const showStartMarker = false;
  const showEndMarker = true;
  const svgClassNames = [
    'curved-arrow',
    direction === 'down' ? 'curved-arrow--vertical' : '',
    direction === 'backward' ? 'curved-arrow--reverse' : '',
    !animated ? 'curved-arrow--static' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={svgClassNames}
      viewBox={viewBoxes[direction]}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {showEndMarker && (
          <marker
            id={`${markerId}-end`}
            markerWidth="10"
            markerHeight="10"
            refX="7"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill={color} />
          </marker>
        )}
        {showStartMarker && (
          <marker
            id={`${markerId}-start`}
            markerWidth="10"
            markerHeight="10"
            refX="3"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M10 0 L0 5 L10 10 Z" fill={color} />
          </marker>
        )}
      </defs>
      <path
        className="curved-arrow__path"
        d={pathByDirection[direction]}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={showEndMarker ? `url(#${markerId}-end)` : undefined}
        markerStart={showStartMarker ? `url(#${markerId}-start)` : undefined}
      />
    </svg>
  );
}

export function createCurvedArrowPath(direction: CurvedArrowDirection) {
  return pathByDirection[direction];
}
