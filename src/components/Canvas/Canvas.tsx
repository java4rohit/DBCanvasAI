import { useState, useRef, useEffect, useCallback } from 'react';
import type { Table, Relation, Viewport } from '../../types/schema';
import { TableCard } from './TableCard';
import { RelationshipLines } from './RelationshipLines';
import { RelationGuide } from './RelationGuide';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Plus, Grid, Layout, BookOpen } from 'lucide-react';

// A valid connect target is either the small port dot itself, or anywhere on the
// column row it belongs to — aiming for a 10px dot while dragging is unreliable,
// so the whole row (which also carries data-table-id/data-col-id) is droppable too.
function findConnectTarget(els: Element[]): HTMLElement | undefined {
  return els.find(el => el.classList.contains('port-btn') || el.hasAttribute('data-col-id')) as HTMLElement | undefined;
}

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
  onChangeRelationType?: (relationId: string, type: '1:1' | '1:N' | 'N:M') => void;
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
  onChangeRelationType,
  onAutoArrange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGuide, setShowGuide] = useState(false);

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
  // Ref mirrors connectingSource so mousemove always has fresh value (no stale closure)
  const connectingRef = useRef<typeof connectingSource>(null);
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

  // Start drag — compute exact port center, prevent canvas pan from starting
  const handleStartConnect = (tableId: string, columnId: string, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const portEl = e.currentTarget as HTMLElement;
    const portRect = portEl.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasX = (portRect.left + portRect.width / 2 - containerRect.left - viewport.x) / viewport.zoom;
    const canvasY = (portRect.top + portRect.height / 2 - containerRect.top - viewport.y) / viewport.zoom;

    const src = { tableId, columnId, startX: canvasX, startY: canvasY, currentX: canvasX, currentY: canvasY };
    connectingRef.current = src;
    setConnectingSource(src);
    setIsPanning(false); // ensure canvas pan doesn't steal events
  };

  // End connection — not used for port-drop (handled in mouseUp via hit-test)
  const handleEndConnect = (_targetTableId: string, _targetColId: string) => {};

  // Global mouse move — uses refs so no stale closure issues
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (connectingRef.current && containerRef.current) {
      // Update drag line end
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      setConnectingSource(prev => prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null);
      connectingRef.current = connectingRef.current
        ? { ...connectingRef.current, currentX: canvasX, currentY: canvasY } : null;

      // Hit-test: find any port button (or its column row) under the cursor during drag
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const portEl = findConnectTarget(els);
      // Clear previous highlight
      document.querySelectorAll('[data-highlighted]').forEach(el => (el as HTMLElement).removeAttribute('data-highlighted'));
      if (portEl) {
        const tblId = portEl.dataset.tableId;
        const colId = portEl.dataset.colId;
        if (tblId && colId && tblId !== connectingRef.current?.tableId) {
          hoveredPortRef.current = { tableId: tblId, columnId: colId };
          portEl.setAttribute('data-highlighted', ''); // visually highlight target
        } else {
          hoveredPortRef.current = null;
        }
      } else {
        hoveredPortRef.current = null;
      }
      return;
    }

    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setViewport(prev => ({ ...prev, x: panStartRef.current.startViewportX + dx, y: panStartRef.current.startViewportY + dy }));
    } else if (draggingTableId) {
      const dx = (e.clientX - dragTableStartRef.current.startX) / viewport.zoom;
      const dy = (e.clientY - dragTableStartRef.current.startY) / viewport.zoom;
      const newX = Math.round((dragTableStartRef.current.startTableX + dx) / 10) * 10;
      const newY = Math.round((dragTableStartRef.current.startTableY + dy) / 10) * 10;
      onUpdateTablePosition(draggingTableId, { x: newX, y: newY });
    }
  }, [isPanning, draggingTableId, viewport, onUpdateTablePosition]);

  // Global mouse up — hit-test port elements to finalize connection
  const handleMouseUp = useCallback((e: MouseEvent) => {
    const src = connectingRef.current;
    if (src) {
      // Hit-test all elements under cursor
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const portEl = findConnectTarget(els);
      if (portEl) {
        const tgtTableId = portEl.dataset.tableId;
        const tgtColId = portEl.dataset.colId;
        if (tgtTableId && tgtColId && tgtTableId !== src.tableId) {
          onCreateRelation(src.tableId, src.columnId, tgtTableId, tgtColId);
        }
      }
      connectingRef.current = null;
      setConnectingSource(null);
      hoveredPortRef.current = null;
      document.querySelectorAll('[data-highlighted]').forEach(el => (el as HTMLElement).removeAttribute('data-highlighted'));
      setIsPanning(false);
      setDraggingTableId(null);
      return;
    }
    setIsPanning(false);
    setDraggingTableId(null);
  }, [onCreateRelation]);

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
          onChangeRelationType={onChangeRelationType}
        />

        {/* Live Dragging Connection Line — bezier curve preview */}
        {connectingSource && (() => {
          const sx = connectingSource.startX;
          const sy = connectingSource.startY;
          const ex = connectingSource.currentX;
          const ey = connectingSource.currentY;
          const curv = Math.max(Math.abs(ex - sx) * 0.5, 60);
          const c1x = sx + curv;
          const c2x = ex - curv;
          const path = `M${sx},${sy} C${c1x},${sy} ${c2x},${ey} ${ex},${ey}`;
          return (
            <svg className="absolute inset-0 pointer-events-none overflow-visible z-30"
              style={{ width: '10000px', height: '10000px' }}>
              {/* Glow */}
              <path d={path} fill="none" stroke="#f97316" strokeWidth={6} strokeOpacity={0.15} />
              {/* Main dashed curve */}
              <path d={path} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="6 4" />
              {/* Start dot */}
              <circle cx={sx} cy={sy} r={5} fill="#f97316" />
              <circle cx={sx} cy={sy} r={9} fill="none" stroke="#f97316" strokeWidth={1.5} strokeOpacity={0.4} />
              {/* End dot */}
              <circle cx={ex} cy={ey} r={5} fill="#38bdf8" />
              <circle cx={ex} cy={ey} r={9} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.4} />
            </svg>
          );
        })()}

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
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1.5 p-1.5 rounded-xl backdrop-blur-md shadow-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
        <button onClick={handleZoomIn} title="Zoom In" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomOut} title="Zoom Out" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <ZoomOut size={16} />
        </button>
        <div className="px-2 font-mono text-xs select-none" style={{ color: 'var(--text-dim)' }}>
          {Math.round(viewport.zoom * 100)}%
        </div>
        <div className="w-[1px] h-4" style={{ background: 'var(--border-subtle)' }} />
        <button onClick={handleFitToScreen} title="Fit All Tables to Screen" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <Maximize2 size={16} />
        </button>
        <button onClick={handleResetZoom} title="Reset Zoom & Pan" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <RotateCcw size={15} />
        </button>
        <button onClick={onAutoArrange} title="Auto-Arrange Layout" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <Layout size={16} />
        </button>
        <div className="w-[1px] h-4" style={{ background: 'var(--border-subtle)' }} />
        <button onClick={() => setShowGuide(v => !v)} title="Relation Guide" className="p-2 rounded-lg transition-colors"
          style={{ color: showGuide ? 'var(--brand)' : 'var(--text-muted)', background: showGuide ? 'var(--brand-subtle)' : 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')} onMouseLeave={e => { if (!showGuide) e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <BookOpen size={16} />
        </button>
      </div>

      {/* Relation Guide Panel */}
      {showGuide && <RelationGuide onClose={() => setShowGuide(false)} />}



      {/* Canvas Quick Add Hint if empty */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto p-8 rounded-2xl backdrop-blur-xl text-center max-w-md shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              <Grid size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-main)' }}>Blank Architecture Canvas</h3>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Design a database schema from scratch or select one of the 14 guided LMS steps from the left lab panel.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onAddTable}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-medium transition-all"
                style={{ background: 'var(--brand)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
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
