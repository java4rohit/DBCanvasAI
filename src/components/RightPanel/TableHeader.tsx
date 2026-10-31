import React, { useState } from 'react';
import { Database, Trash2, Plus, X } from 'lucide-react';
import type { Table, TableColor } from '../../types/schema';

const TABLE_COLORS: TableColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];
const COLOR_HEX: Record<TableColor, string> = {
  blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
  violet: '#8b5cf6', rose: '#f43f5e', cyan: '#06b6d4', slate: '#64748b',
};

export const TableHeader: React.FC<{
  table: Table;
  onNameChange: (n: string) => void;
  onColorChange: (c: TableColor) => void;
  onDelete: () => void;
}> = ({ table, onNameChange, onColorChange, onDelete }) => (
  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <Database size={14} className="shrink-0" style={{ color: 'var(--brand)' }} />
        <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-main)' }}>{table.name}</span>
      </div>
      <button onClick={onDelete} className="p-1 transition-colors hover:text-red-400" style={{ color: 'var(--text-dim)' }}>
        <Trash2 size={14} />
      </button>
    </div>
    <p className="text-[9px] font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>TABLE IN SCHEMA</p>
    <div className="mb-2">
      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>NAME</label>
      <input
        type="text"
        value={table.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
      />
    </div>
    <div>
      <label className="text-[10px] block mb-1.5" style={{ color: 'var(--text-muted)' }}>COLOR</label>
      <div className="flex gap-1.5">
        {TABLE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${table.color === c ? 'scale-125 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: COLOR_HEX[c] }}
          />
        ))}
      </div>
    </div>
  </div>
);

export const UniqueTogether: React.FC<{
  columns: Table['columns'];
  constraints: string[][];
  onSave: (v: string[][]) => void;
}> = ({ columns, constraints = [], onSave }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) =>
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const addConstraint = () => {
    if (selected.length < 2) return;
    const sorted = [...selected].sort();
    const exists = constraints.some(c => [...c].sort().join(',') === sorted.join(','));
    if (!exists) onSave([...constraints, sorted]);
    setSelected([]);
  };

  const removeConstraint = (idx: number) =>
    onSave(constraints.filter((_, i) => i !== idx));

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="px-3 py-2.5" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Unique Together</div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Combination of columns that must be unique together</p>
      </div>
      <div className="p-3" style={{ background: 'var(--bg-card)' }}>
        {/* Existing constraints */}
        {constraints.length > 0 && (
          <div className="mb-3 flex flex-col gap-1.5">
            {constraints.map((cols, idx) => (
              <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: 'var(--text-dim)' }}>UNIQUE</span>
                  {cols.map((col, ci) => (
                    <React.Fragment key={col}>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                        {col}
                      </span>
                      {ci < cols.length - 1 && <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>+</span>}
                    </React.Fragment>
                  ))}
                </div>
                <button onClick={() => removeConstraint(idx)} className="ml-2 shrink-0 hover:text-red-400 transition-colors" style={{ color: 'var(--text-dim)' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Column picker */}
        <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Pick 2+ columns:</div>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {columns.map(col => {
            const active = selected.includes(col.name);
            return (
              <button key={col.id} onClick={() => toggle(col.name)}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all"
                style={active
                  ? { background: 'var(--brand-subtle)', borderColor: 'var(--brand)', color: 'var(--brand)', fontWeight: 700 }
                  : { background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                {col.name}
              </button>
            );
          })}
        </div>
        {/* Add button */}
        <button onClick={addConstraint} disabled={selected.length < 2}
          className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg w-full justify-center transition-all"
          style={selected.length >= 2
            ? { background: 'var(--brand)', color: '#fff', cursor: 'pointer' }
            : { background: 'var(--bg-elevated)', color: 'var(--text-dim)', cursor: 'not-allowed', opacity: 0.5 }}>
          <Plus size={12} />
          {selected.length >= 2 ? `Add unique (${selected.join(', ')})` : 'Select 2+ columns first'}
        </button>
      </div>
    </div>
  );
};
