import React from 'react';
import type { Table, Relation } from '../../types/schema';

interface RelationshipLinesProps {
  tables: Table[];
  relations: Relation[];
  selectedRelationId: string | null;
  hoveredRelationId: string | null;
  onSelectRelation: (relationId: string) => void;
  onDeleteRelation: (relationId: string) => void;
  onHoverRelation: (relationId: string | null) => void;
}

const TABLE_WIDTH = 280;
const HEADER_HEIGHT = 44;
const COMMENT_HEIGHT = 26;
const ROW_HEIGHT = 32;

function getColumnPortPosition(
  table: Table,
  columnId: string,
  targetTableX: number
): { x: number; y: number; isRightSide: boolean } {
  const colIndex = table.columns.findIndex((c) => c.id === columnId);
  const extraHeader = table.comment ? COMMENT_HEIGHT : 0;
  const colY = table.position.y + HEADER_HEIGHT + extraHeader + colIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

  // Decide whether to exit from left or right of table based on target position
  const isRightSide = targetTableX > table.position.x;
  const colX = isRightSide ? table.position.x + TABLE_WIDTH : table.position.x;

  return { x: colX, y: colY, isRightSide };
}

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({
  tables,
  relations,
  selectedRelationId,
  hoveredRelationId,
  onSelectRelation,
  onDeleteRelation: _onDeleteRelation,
  onHoverRelation,
}) => {
  return (
    <svg className="absolute inset-0 pointer-events-none w-[10000px] h-[10000px] overflow-visible z-0">
      <defs>
        <marker
          id="relation-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
        </marker>
        <marker
          id="relation-arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
        </marker>
      </defs>

      {relations.map((rel) => {
        const srcTable = tables.find((t) => t.id === rel.sourceTableId);
        const tgtTable = tables.find((t) => t.id === rel.targetTableId);

        if (!srcTable || !tgtTable) return null;

        const isSelected = selectedRelationId === rel.id;
        const isHovered = hoveredRelationId === rel.id;

        // Source column port (usually FK child)
        const srcPort = getColumnPortPosition(srcTable, rel.sourceColumnId, tgtTable.position.x);
        // Target column port (usually PK parent)
        const tgtPort = getColumnPortPosition(tgtTable, rel.targetColumnId, srcTable.position.x);

        // Bezier curve control points
        const dx = Math.abs(tgtPort.x - srcPort.x) * 0.55;
        const curvature = Math.max(dx, 50);

        const c1x = srcPort.isRightSide ? srcPort.x + curvature : srcPort.x - curvature;
        const c1y = srcPort.y;
        const c2x = tgtPort.isRightSide ? tgtPort.x + curvature : tgtPort.x - curvature;
        const c2y = tgtPort.y;

        const pathData = `M ${srcPort.x} ${srcPort.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tgtPort.x} ${tgtPort.y}`;

        // Midpoint for badge
        const midX = (srcPort.x + tgtPort.x) / 2;
        const midY = (srcPort.y + tgtPort.y) / 2;

        return (
          <g
            key={rel.id}
            className="cursor-pointer pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRelation(rel.id);
            }}
            onMouseEnter={() => onHoverRelation(rel.id)}
            onMouseLeave={() => onHoverRelation(null)}
          >
            {/* Invisible thick path for easy mouse hovering/clicking */}
            <path d={pathData} fill="none" stroke="transparent" strokeWidth={18} />

            {/* Glowing shadow path if active */}
            {(isSelected || isHovered) && (
              <path
                d={pathData}
                fill="none"
                stroke="#f97316"
                strokeWidth={5}
                strokeOpacity={0.4}
                className="animate-pulse"
              />
            )}

            {/* Visible Connection Line */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#f97316' : isHovered ? '#38bdf8' : '#64748b'}
              strokeWidth={isSelected || isHovered ? 2.5 : 1.75}
              strokeDasharray={rel.type === '1:1' ? '4 3' : undefined}
              markerEnd={isSelected ? 'url(#relation-arrow-active)' : 'url(#relation-arrow)'}
              className="transition-colors duration-150"
            />

            {/* Start and end port connection dots */}
            <circle cx={srcPort.x} cy={srcPort.y} r={3.5} fill={isSelected ? '#f97316' : '#38bdf8'} />
            <circle cx={tgtPort.x} cy={tgtPort.y} r={3.5} fill={isSelected ? '#f97316' : '#38bdf8'} />

            {/* Cardinality Badge at Midpoint */}
            <g transform={`translate(${midX - 16}, ${midY - 10})`}>
              <rect
                width={32}
                height={18}
                rx={9}
                fill="#0f172a"
                stroke={isSelected ? '#f97316' : isHovered ? '#38bdf8' : '#334155'}
                strokeWidth={1.2}
              />
              <text
                x={16}
                y={12.5}
                textAnchor="middle"
                fill={isSelected ? '#fb923c' : isHovered ? '#7dd3fc' : '#94a3b8'}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
              >
                {rel.type}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};
