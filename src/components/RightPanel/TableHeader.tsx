import React from 'react';
import { Database, Trash2, Plus } from 'lucide-react';
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
  <div className="px-4 py-3 border-b border-white/10 bg-[#11131f]">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <Database size={14} className="text-brand shrink-0" />
        <span className="font-mono text-sm font-bold text-white">{table.name}</span>
      </div>
      <button onClick={onDelete} className="text-slate-500 hover:text-red-400 p-1 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-3">TABLE IN SCHEMA</p>
    <div className="mb-2">
      <label className="text-[10px] text-slate-400 block mb-1">NAME</label>
      <input
        type="text"
        value={table.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full bg-[#191c2c] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand"
      />
    </div>
    <div>
      <label className="text-[10px] text-slate-400 block mb-1.5">COLOR</label>
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
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ columns, value, onChange }) => (
  <div className="mt-4">
    <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
      Unique Together
    </label>
    <p className="text-[10px] text-slate-500 mb-2">
      Each column can repeat on its own, but not all of them together.
    </p>
    <div className="flex flex-wrap gap-1.5">
      {columns.map((col) => (
        <button
          key={col.id}
          onClick={() =>
            onChange(
              value.includes(col.name)
                ? value.filter((n) => n !== col.name)
                : [...value, col.name]
            )
          }
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
            value.includes(col.name)
              ? 'bg-brand/20 border-brand text-brand'
              : 'bg-white/5 border-white/10 text-slate-400 hover:border-slate-500'
          }`}
        >
          {col.name}
        </button>
      ))}
    </div>
    <button className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 mt-2 transition-colors">
      <Plus size={12} /> Pick two or more columns
    </button>
  </div>
);
