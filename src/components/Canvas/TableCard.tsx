import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Table, Column, DataType } from '../../types/schema';
import { Key, Link, Plus, Trash2, X, Check } from 'lucide-react';

// Quick-access types shown in the inline dropdown on the canvas card
const QUICK_TYPES: DataType[] = [
  'BIGSERIAL', 'BIGINT', 'INT', 'TEXT', 'VARCHAR',
  'UUID', 'BOOLEAN', 'TIMESTAMPTZ', 'NUMERIC', 'JSONB', 'ARRAY', 'BYTEA',
];

const TYPE_LABEL: Partial<Record<DataType, string>> = {
  BIGSERIAL: 'bigserial',
  BIGINT: 'bigint',
  INT: 'integer',
  TEXT: 'text',
  VARCHAR: 'varchar',
  UUID: 'uuid',
  BOOLEAN: 'boolean',
  TIMESTAMPTZ: 'timestamptz',
  NUMERIC: 'numeric',
  JSONB: 'jsonb',
  ARRAY: 'text[]',
  BYTEA: 'bytea',
};

/** Inline type-picker — rendered absolutely inside the column row, no fixed positioning */
const TypeDropdown: React.FC<{
  currentType: DataType;
  onSelect: (t: DataType) => void;
  onClose: () => void;
}> = ({ currentType, onSelect, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    // slight delay so the opening click itself doesn't immediately close it
    const tid = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handleClick); };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        zIndex: 9999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        minWidth: 180,
        overflow: 'hidden',
        padding: '4px 0',
      }}
    >
      {QUICK_TYPES.map(t => {
        const isActive = t === currentType;
        return (
          <button
            key={t}
            onMouseDown={e => { e.stopPropagation(); onSelect(t); onClose(); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              background: isActive ? 'var(--brand)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#fff' : 'var(--text-main)',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isActive && <Check size={13} />}
            </span>
            {TYPE_LABEL[t] ?? t.toLowerCase()}
          </button>
        );
      })}
    </div>
  );
};

interface TableCardProps {
  table: Table;
  isSelected: boolean;
  isConnectingSource: boolean;
  highlightedColumnId: string | null;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddColumn: () => void;
  onUpdateTable?: (updated: Table) => void;
  onStartConnect: (columnId: string, event: React.MouseEvent) => void;
  onEndConnect: (columnId: string) => void;
  onPortHover?: (columnId: string | null) => void;
  onColumnHover: (columnId: string | null) => void;
  onMouseDownDrag: (event: React.MouseEvent) => void;
}

const colorStyles: Record<
  string,
  {
    headerBg: string;
    border: string;
    accent: string;
    glow: string;
  }
> = {
  blue: {
    headerBg: 'from-blue-900/60 to-blue-950/40 border-b-blue-500/30',
    border: 'border-blue-500/40 hover:border-blue-400',
    accent: 'bg-blue-500',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  emerald: {
    headerBg: 'from-emerald-900/60 to-emerald-950/40 border-b-emerald-500/30',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    accent: 'bg-emerald-500',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  amber: {
    headerBg: 'from-amber-900/60 to-amber-950/40 border-b-amber-500/30',
    border: 'border-amber-500/40 hover:border-amber-400',
    accent: 'bg-amber-500',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  violet: {
    headerBg: 'from-violet-900/60 to-violet-950/40 border-b-violet-500/30',
    border: 'border-violet-500/40 hover:border-violet-400',
    accent: 'bg-violet-500',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
  rose: {
    headerBg: 'from-rose-900/60 to-rose-950/40 border-b-rose-500/30',
    border: 'border-rose-500/40 hover:border-rose-400',
    accent: 'bg-rose-500',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  cyan: {
    headerBg: 'from-cyan-900/60 to-cyan-950/40 border-b-cyan-500/30',
    border: 'border-cyan-500/40 hover:border-cyan-400',
    accent: 'bg-cyan-500',
    glow: 'rgba(6, 182, 212, 0.15)',
  },
  slate: {
    headerBg: 'from-slate-800/80 to-slate-900/60 border-b-slate-700/50',
    border: 'border-slate-700 hover:border-slate-500',
    accent: 'bg-slate-400',
    glow: 'rgba(148, 163, 184, 0.1)',
  },
};

export const TableCard: React.FC<TableCardProps> = ({
  table,
  isSelected,
  isConnectingSource: _isConnectingSource,
  highlightedColumnId,
  onSelect,
  onEdit: _onEdit,
  onDelete,
  onAddColumn,
  onUpdateTable,
  onStartConnect,
  onEndConnect,
  onPortHover,
  onColumnHover,
  onMouseDownDrag,
}) => {
  const currentStyle = colorStyles[table.color] || colorStyles.blue;
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [openTypeColId, setOpenTypeColId] = useState<string | null>(null);
  const typeBadgeRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Resize logic ──────────────────────────────────────────────────────────
  const cardWidth = table.width ?? 280;
  const resizeRef = useRef<{ side: 'left'|'right'|'top'; startX: number; startY: number; startW: number; startPos: {x:number;y:number} } | null>(null);

  const startResize = useCallback((side: 'left'|'right'|'top', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { side, startX: e.clientX, startY: e.clientY, startW: cardWidth, startPos: { ...table.position } };
    document.body.style.cursor = side === 'top' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const r = resizeRef.current;
      if (!r || !onUpdateTable) return;
      if (r.side === 'right') {
        const next = Math.min(Math.max(r.startW + (ev.clientX - r.startX), 180), 600);
        onUpdateTable({ ...table, width: Math.round(next) });
      } else if (r.side === 'left') {
        const delta = ev.clientX - r.startX;
        const next = Math.min(Math.max(r.startW - delta, 180), 600);
        const newX = r.startPos.x + (r.startW - next);
        onUpdateTable({ ...table, width: Math.round(next), position: { x: Math.round(newX), y: r.startPos.y } });
      } else if (r.side === 'top') {
        // top drag = move vertically (reposition)
        const dy = ev.clientY - r.startY;
        onUpdateTable({ ...table, position: { x: r.startPos.x, y: Math.round(r.startPos.y + dy) } });
        resizeRef.current = { ...r, startY: ev.clientY, startPos: { x: r.startPos.x, y: Math.round(r.startPos.y + dy) } };
      }
    };
    const onUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [cardWidth, table, onUpdateTable]);

  const handleAddCol = () => {
    const name = newColName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) { setAddingCol(false); setNewColName(''); return; }
    const newCol: Column = {
      id: `col_${Date.now()}`,
      name,
      type: 'VARCHAR',
      typeArgs: '255',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
      isIndexed: false,
    };
    if (onUpdateTable) {
      onUpdateTable({ ...table, columns: [...table.columns, newCol] });
    } else {
      onAddColumn();
    }
    setNewColName('');
    setAddingCol(false);
  };

  // Focus input whenever addingCol becomes true
  useEffect(() => {
    if (addingCol) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [addingCol]);

  const handleDeleteCol = (colId: string) => {
    if (table.columns.length <= 1) return;
    if (onUpdateTable) {
      onUpdateTable({ ...table, columns: table.columns.filter(c => c.id !== colId) });
    }
  };

  return (
    <div
      id={`table-${table.id}`}
      className="table-card absolute select-none rounded-xl backdrop-blur-md transition-shadow duration-200"
      style={{
        transform: `translate3d(${table.position.x}px, ${table.position.y}px, 0)`,
        width: `${cardWidth}px`,
        minWidth: '200px',
        overflow: 'visible',
        background: 'var(--bg-card)',
        border: isSelected ? '1.5px solid var(--brand)' : `1.5px solid ${currentStyle.glow}`,
        boxShadow: isSelected
          ? '0 10px 30px -10px rgba(249,115,22,0.35)'
          : `0 8px 24px -8px ${currentStyle.glow}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Table Header / Drag Handle */}
      <div
        className="table-header px-3.5 py-2.5 rounded-t-xl flex items-center justify-between cursor-grab active:cursor-grabbing"
        style={{ background: 'var(--bg-elevated)', borderBottom: `1px solid ${currentStyle.glow}` }}
        onMouseDown={onMouseDownDrag}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`w-2.5 h-2.5 rounded-full ${currentStyle.accent} shadow-sm shrink-0`} />
          <span className="font-mono font-semibold text-sm tracking-tight truncate" style={{ color: 'var(--text-main)' }}>
            {table.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' }}>
            {table.columns.length}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
          <button
            title="Delete Table"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:text-red-400 transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <Trash2 size={13} />
          </button>
          <button
            title="Add Column"
            onClick={(e) => { e.stopPropagation(); setAddingCol(true); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Table Description if any */}
      {table.comment && (
        <div className="px-3.5 py-1 text-[11px] italic truncate" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          {table.comment}
        </div>
      )}

      {/* Column Rows */}
      <div className="table-columns py-1 text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {table.columns.map((col: Column) => {
          const isHighlighted = highlightedColumnId === col.id;
          // Check if this column is part of any uniqueTogether constraint
          const isUniqueTogether = (table.uniqueTogether ?? []).some(group => group.includes(col.name));

          return (
            <div
              key={col.id}
              id={`col-${table.id}-${col.id}`}
              className="group relative flex items-center justify-between px-3 py-1.5 transition-colors"
              style={{
                overflow: 'visible',
                background: isHighlighted ? 'var(--brand-subtle)' : 'transparent',
                color: isHighlighted ? 'var(--brand)' : 'var(--text-muted)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={() => onColumnHover(col.id)}
              onMouseLeave={() => onColumnHover(null)}
            >
              {/* Column Name & Icon */}
              <div className="flex items-center gap-1.5 overflow-hidden" style={{ flex: 1, minWidth: 0 }}>
                {col.isPrimaryKey ? (
                  <span title="Primary Key" className="text-amber-400 shrink-0">
                    <Key size={11} className="stroke-[2.5]" />
                  </span>
                ) : col.isForeignKey ? (
                  <span title="Foreign Key" className="text-cyan-400 shrink-0">
                    <Link size={11} className="stroke-[2.5]" />
                  </span>
                ) : (
                  <span style={{ width: 11, height: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-strong)', display: 'block' }} />
                  </span>
                )}

                <span
                  className="font-mono truncate text-[11px]"
                  style={{ color: col.isPrimaryKey ? 'var(--text-main)' : col.isForeignKey ? '#67e8f9' : 'var(--text-muted)', fontWeight: col.isPrimaryKey ? 600 : 400 }}
                >
                  {col.name}
                </span>

                {/* Constraint Badges */}
                {col.isPrimaryKey && (
                  <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>PK</span>
                )}
                {col.isForeignKey && (
                  <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(6,182,212,0.15)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.3)', flexShrink: 0 }}>FK</span>
                )}
                {col.isUnique && !col.isPrimaryKey && (
                  <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', flexShrink: 0 }}>UQ</span>
                )}
                {isUniqueTogether && !col.isUnique && !col.isPrimaryKey && (
                  <span title="Part of Unique Together constraint" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', flexShrink: 0 }}>UQ</span>
                )}
              </div>

              {/* Type badge + connector ports (left & right) — shown only on row hover */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, position: 'relative' }}>
                <span
                  ref={el => { if (el) typeBadgeRefs.current.set(col.id, el); else typeBadgeRefs.current.delete(col.id); }}
                  title="Click to change type"
                  onClick={e => { e.stopPropagation(); setOpenTypeColId(prev => prev === col.id ? null : col.id); }}
                  style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-subtle)', textTransform: 'lowercase', letterSpacing: '0.03em', cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.background = 'var(--brand-subtle)'; (e.currentTarget as HTMLSpanElement).style.color = 'var(--brand)'; (e.currentTarget as HTMLSpanElement).style.borderColor = 'var(--brand-border)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.background = 'var(--bg-input)'; (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLSpanElement).style.borderColor = 'var(--border-subtle)'; }}
                >
                  {(TYPE_LABEL[col.type] ?? col.type.toLowerCase())}
                </span>
                {openTypeColId === col.id && (
                  <TypeDropdown
                    currentType={col.type}
                    anchorRef={{ current: typeBadgeRefs.current.get(col.id) ?? null }}
                    onSelect={newType => {
                      if (onUpdateTable) {
                        onUpdateTable({ ...table, columns: table.columns.map(c => c.id === col.id ? { ...c, type: newType } : c) });
                      }
                    }}
                    onClose={() => setOpenTypeColId(null)}
                  />
                )}

                {/* Delete col button — shows on hover (only if not PK or last col) */}
                {!col.isPrimaryKey && table.columns.length > 1 && (
                  <button
                    title="Delete column"
                    style={{ position: 'absolute', right: -28, top: '50%', transform: 'translateY(-50%)', color: '#475569', padding: 2, borderRadius: 4, cursor: 'pointer', zIndex: 20, opacity: 0, transition: 'opacity 0.15s' }}
                    className="col-delete-btn"
                    onMouseDown={(e) => { e.stopPropagation(); handleDeleteCol(col.id); }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add column row */}
        {addingCol ? (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--brand-subtle)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Plus size={11} color="var(--brand)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); handleAddCol(); }
                if (e.key === 'Escape') { setAddingCol(false); setNewColName(''); }
              }}
              onBlur={() => {
                // Small delay so click-outside doesn't race with Enter key
                setTimeout(() => handleAddCol(), 100);
              }}
              placeholder="column_name"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: 11, caretColor: 'var(--brand)' }}
            />
          </div>
        ) : (
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', width: '100%', color: 'var(--text-dim)', fontSize: 11, borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'color 0.15s', background: 'transparent', border: 'none' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--brand)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setAddingCol(true); }}
          >
            <Plus size={12} />
            <span>Add column</span>
          </button>
        )}
      </div>

      {/* Invisible resize edge — RIGHT */}
      <div onMouseDown={e => startResize('right', e)}
        style={{ position:'absolute', top:4, right:-4, width:8, height:'calc(100% - 8px)', cursor:'ew-resize', zIndex:40 }} />

      {/* Invisible resize edge — LEFT */}
      <div onMouseDown={e => startResize('left', e)}
        style={{ position:'absolute', top:4, left:-4, width:8, height:'calc(100% - 8px)', cursor:'ew-resize', zIndex:40 }} />

      {/* Invisible resize edge — TOP */}
      <div onMouseDown={e => startResize('top', e)}
        style={{ position:'absolute', top:-4, left:8, width:'calc(100% - 16px)', height:8, cursor:'ns-resize', zIndex:40 }} />

      <style>{`
        .table-columns .group:hover .col-delete-btn { opacity: 1 !important; }
        .table-columns .group:hover { background: var(--bg-elevated) !important; }
      `}</style>
    </div>
  );
};
