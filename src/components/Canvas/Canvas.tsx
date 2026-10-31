import { useState, useRef, useEffect, useCallback } from 'react';
import type { Table, Relation, Viewport } from '../../types/schema';
import { TableCard } from './TableCard';
import { RelationshipLines } from './RelationshipLines';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Plus, Grid, Layout } from 'lucide-react';

interface CanvasProps {
  tables: Table[];
  relations: Relation[];
  selectedTableId: string | null;
  selectedRelationId: string | null;
  onSelectTable: (tableId: string | null) => void;
  onSelectRelation: (relationId: string | null) => void;
  onUpdateTablePosition: (tableId: string, position: { x: number; y: number }) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
  onUpdateTable?: (updated: Table) => void;
  onAddTable: () => void;
  onDropTable?: (canvasX: number, canvasY: number) => void;
  onCreateRelation: (sourceTableId: string, sourceColId: string, targetTableId: string, targetColId: string) => void;
  onDeleteRelation: (relationId: string) => void;
  onAutoArrange: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  tables,
  relations,
  selectedTableId,
  selectedRelationId,
  onSelectTable,
  onSelectRelation,
  onUpdateTablePosition,
  onEditTable,
  onDeleteTable,
  onAddColumn,
  onUpdateTable,
  onAddTable,
  onDropTable,
  onCreateRelation,
  onDeleteRelation,
  onAutoArrange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport State (Pan & Zoom)
  const [viewport, setViewport] = useState<Viewport>({ x: 40, y: 30, zoom: 0.95 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; startViewportX: number; startViewportY: number }>({
    x: 0,
    y: 0,
    startViewportX: 0,
    startViewportY: 0,
  });

  // Dragging Table State
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const dragTableStartRef = useRef<{
    startX: number;
    startY: number;
    startTableX: number;
    startTableY: number;
  }>({ startX: 0, startY: 0, startTableX: 0, startTableY: 0 });

  // Creating Connection State
  const [connectingSource, setConnectingSource] = useState<{
    tableId: string;
    columnId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);
  const [highlightedColumnId, setHighlightedColumnId] = useState<string | null>(null);
  // Track which column port the mouse is hovering over during a connection drag
  const hoveredPortRef = useRef<{ tableId: string; columnId: string } | null>(null);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.35), 2.0);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on mouse position
    const newX = mouseX - ((mouseX - viewport.x) / viewport.zoom) * newZoom;
    const newY = mouseY - ((mouseY - viewport.y) / viewport.zoom) * newZoom;

    setViewport({ x: newX, y: newY, zoom: newZoom });
  };

  // Canvas Mouse Down (Panning or Canvas Click)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only left click or middle click
    if (e.button !== 0 && e.button !== 1) return;

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
    };

    onSelectTable(null);
    onSelectRelation(null);
  };

  // Table Card Mouse Down (Table Dragging)
  const handleTableMouseDown = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTable(tableId);

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setDraggingTableId(tableId);
    dragTableStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTableX: table.position.x,
      startTableY: table.position.y,
    };
  };

  // Start drag relation from column port
  const handleStartConnect = (tableId: string, columnId: string, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setConnectingSource({
      tableId,
      columnId,
      startX: canvasX,
      startY: canvasY,
      currentX: canvasX,
      currentY: canvasY,
    });
  };

  // End connection drop
  const handleEndConnect = (targetTableId: string, targetColId: string) => {
    if (!connectingSource) return;

    if (connectingSource.tableId !== targetTableId) {
      onCreateRelation(connectingSource.tableId, connectingSource.columnId, targetTableId, targetColId);
    }
    setConnectingSource(null);
  };

  // Global mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewport((prev) => ({
          ...prev,
          x: panStartRef.current.startViewportX + dx,
          y: panStartRef.current.startViewportY + dy,
        }));
      } else if (draggingTableId) {
        const dx = (e.clientX - dragTableStartRef.current.startX) / viewport.zoom;
        const dy = (e.clientY - dragTableStartRef.current.startY) / viewport.zoom;

        const newX = Math.round((dragTableStartRef.current.startTableX + dx) / 10) * 10;
        const newY = Math.round((dragTableStartRef.current.startTableY + dy) / 10) * 10;

        onUpdateTablePosition(draggingTableId, { x: newX, y: newY });
      } else if (connectingSource && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

        setConnectingSource((prev) => (prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null));
      }
    },
    [isPanning, draggingTableId, connectingSource, viewport, onUpdateTablePosition]
  );

  // Global mouse up — finalize connection if hovering a port
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingTableId(null);
    if (connectingSource && hoveredPortRef.current) {
      const { tableId: tgtTblId, columnId: tgtColId } = hoveredPortRef.current;
      if (tgtTblId !== connectingSource.tableId) {
        onCreateRelation(connectingSource.tableId, connectingSource.columnId, tgtTblId, tgtColId);
      }
    }
    setConnectingSource(null);
    hoveredPortRef.current = null;
  }, [connectingSource, onCreateRelation]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Viewport action helpers
  const handleZoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(v.zoom * 1.15, 2.0) }));
  const handleZoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(v.zoom * 0.85, 0.35) }));
  const handleResetZoom = () => setViewport({ x: 40, y: 30, zoom: 0.95 });
  const handleFitToScreen = () => {
    if (tables.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    tables.forEach((t) => {
      minX = Math.min(minX, t.position.x);
      minY = Math.min(minY, t.position.y);
      maxX = Math.max(maxX, t.position.x + 300);
      maxY = Math.max(maxY, t.position.y + 350);
    });
    setViewport({
      x: 60 - minX * 0.7,
      y: 60 - minY * 0.7,
      zoom: 0.7,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden select-none cursor-default" style={{ backgroundColor: 'var(--bg-dark)' }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!containerRef.current || !onDropTable) return;
        const rect = containerRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const canvasY = (e.clientY - rect.top  - viewport.y) / viewport.zoom;
        onDropTable(Math.round(canvasX), Math.round(canvasY));
      }}
    >
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
          backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* Canvas World transformed container */}
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
        }}
      >
        {/* SVG Relations */}
        <RelationshipLines
          tables={tables}
          relations={relations}
          selectedRelationId={selectedRelationId}
          hoveredRelationId={hoveredRelationId}
          onSelectRelation={onSelectRelation}
          onDeleteRelation={onDeleteRelation}
          onHoverRelation={setHoveredRelationId}
        />

        {/* Live Dragging Connection Line */}
        {connectingSource && (
          <svg className="absolute inset-0 pointer-events-none w-[10000px] h-[10000px] overflow-visible z-30">
            <line
              x1={connectingSource.startX}
              y1={connectingSource.startY}
              x2={connectingSource.currentX}
              y2={connectingSource.currentY}
              stroke="#f97316"
              strokeWidth={2.5}
              strokeDasharray="6 4"
            />
            <circle cx={connectingSource.startX} cy={connectingSource.startY} r={5} fill="#f97316" />
            <circle cx={connectingSource.currentX} cy={connectingSource.currentY} r={4} fill="#38bdf8" />
          </svg>
        )}

        {/* Table Cards */}
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            isSelected={selectedTableId === table.id}
            isConnectingSource={connectingSource?.tableId === table.id}
            highlightedColumnId={highlightedColumnId}
            onSelect={() => onSelectTable(table.id)}
            onEdit={() => onEditTable(table)}
            onDelete={() => onDeleteTable(table.id)}
            onAddColumn={() => onAddColumn(table.id)}
            onUpdateTable={onUpdateTable}
            onStartConnect={(colId, e) => handleStartConnect(table.id, colId, e)}
            onEndConnect={(colId) => handleEndConnect(table.id, colId)}
            onPortHover={(colId) => { hoveredPortRef.current = colId ? { tableId: table.id, columnId: colId } : null; }}
            onColumnHover={setHighlightedColumnId}
            onMouseDownDrag={(e) => handleTableMouseDown(table.id, e)}
          />
        ))}
      </div>

      {/* Floating Canvas Controls (Bottom Right) */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#11131f]/90 backdrop-blur-md border border-white/10 shadow-xl shadow-black/50 text-slate-300">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <div className="px-2 font-mono text-xs text-slate-400 select-none">
          {Math.round(viewport.zoom * 100)}%
        </div>
        <div className="w-[1px] h-4 bg-white/10" />
        <button
          onClick={handleFitToScreen}
          title="Fit All Tables to Screen"
          className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom & Pan"
          className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={onAutoArrange}
          title="Auto-Arrange Layout"
          className="p-2 rounded-lg hover:bg-white/10 hover:text-brand-light transition-colors"
        >
          <Layout size={16} />
        </button>
      </div>

      {/* Canvas Quick Add Hint if empty */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto p-8 rounded-2xl bg-[#11131f]/80 backdrop-blur-xl border border-white/10 text-center max-w-md shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center mx-auto mb-4">
              <Grid size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Blank Architecture Canvas</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Design a database schema from scratch or select one of the 14 guided LMS steps from the left lab panel.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onAddTable}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium transition-all shadow-lg shadow-brand/25"
              >
                <Plus size={14} /> Add First Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
