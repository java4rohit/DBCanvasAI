import { useState } from 'react';
import type { Table, Column, DataType, TableColor } from '../../types/schema';
import { X, Plus, Trash2, Database } from 'lucide-react';

interface EditTableModalProps {
  isOpen: boolean;
  table: Table | null;
  allTables: Table[];
  onClose: () => void;
  onSave: (updatedTable: Table) => void;
}

const DATA_TYPES: DataType[] = [
  'UUID',
  'BIGINT',
  'INT',
  'VARCHAR',
  'TEXT',
  'BOOLEAN',
  'TIMESTAMP',
  'DECIMAL',
  'JSONB',
  'ENUM',
];

const TABLE_COLORS: TableColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

export const EditTableModal: React.FC<EditTableModalProps> = ({
  isOpen,
  table,
  allTables: _allTables,
  onClose,
  onSave,
}) => {
  // Hooks always run unconditionally; state initialized lazily from current table prop.
  // The parent passes key={table?.id} so this component remounts when table changes.
  const [name, setName] = useState(() => table?.name ?? '');
  const [comment, setComment] = useState(() => table?.comment ?? '');
  const [color, setColor] = useState<TableColor>(() => table?.color ?? 'blue');
  const [columns, setColumns] = useState<Column[]>(() =>
    table ? (JSON.parse(JSON.stringify(table.columns)) as Column[]) : []
  );

  if (!isOpen || !table) return null;

  const handleAddColumn = () => {
    const newCol: Column = {
      id: `col_${Date.now()}`,
      name: 'new_column',
      type: 'VARCHAR',
      typeArgs: '255',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
      isIndexed: false,
    };
    setColumns([...columns, newCol]);
  };

  const handleUpdateColumn = (colId: string, updates: Partial<Column>) => {
    setColumns((prev) =>
      prev.map((c) => {
        if (c.id !== colId) return c;
        const updated = { ...c, ...updates };

        // Primary key logic
        if (updates.isPrimaryKey) {
          updated.isNullable = false;
          updated.isUnique = true;
          updated.isIndexed = true;
        }

        return updated;
      })
    );
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      alert('A table must have at least one column.');
      return;
    }
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...table,
      name: name.trim().toLowerCase().replace(/\s+/g, '_'),
      comment: comment.trim() || undefined,
      color,
      columns,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0e101a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141724]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Edit Table: {table.name}</h3>
              <p className="text-xs text-slate-400">Configure columns, data types, constraints, and keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          {/* Table Meta settings */}
          <div className="p-6 border-b border-white/5 bg-[#10121d] grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Table Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#191c2c] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand"
                placeholder="e.g. users, courses"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Color Theme</label>
              <div className="flex items-center gap-1.5 pt-1">
                {TABLE_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor:
                        c === 'blue'
                          ? '#3b82f6'
                          : c === 'emerald'
                          ? '#10b981'
                          : c === 'amber'
                          ? '#f59e0b'
                          : c === 'violet'
                          ? '#8b5cf6'
                          : c === 'rose'
                          ? '#f43f5e'
                          : c === 'cyan'
                          ? '#06b6d4'
                          : '#64748b',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description / Comment</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#191c2c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
                placeholder="Optional architecture note..."
              />
            </div>
          </div>

          {/* Columns Editor Table */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Columns ({columns.length})
              </h4>
              <button
                type="button"
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-medium border border-brand/25 transition-colors"
              >
                <Plus size={14} /> Add Column
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((col, index) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141724] border border-white/5 hover:border-white/10 text-xs transition-colors"
                >
                  <span className="text-slate-500 font-mono w-5 text-center">{index + 1}</span>

                  {/* Column Name */}
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => handleUpdateColumn(col.id, { name: e.target.value })}
                      className="w-full bg-[#191c2c] border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-brand"
                      placeholder="column_name"
                    />
                  </div>

                  {/* Type Select */}
                  <div className="w-[110px]">
                    <select
                      value={col.type}
                      onChange={(e) => handleUpdateColumn(col.id, { type: e.target.value as DataType })}
                      className="w-full bg-[#191c2c] border border-white/10 rounded px-2 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-brand"
                    >
                      {DATA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type Args (e.g. 255) */}
                  <div className="w-[70px]">
                    <input
                      type="text"
                      value={col.typeArgs || ''}
                      onChange={(e) => handleUpdateColumn(col.id, { typeArgs: e.target.value })}
                      className="w-full bg-[#191c2c] border border-white/10 rounded px-2 py-1.5 font-mono text-xs text-slate-300 focus:outline-none focus:border-brand"
                      placeholder="args"
                      title="e.g. 255 or 10,2"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-1.5 px-2 bg-black/20 rounded py-1 border border-white/5">
                    {/* PK */}
                    <button
                      type="button"
                      onClick={() => handleUpdateColumn(col.id, { isPrimaryKey: !col.isPrimaryKey })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        col.isPrimaryKey
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                      title="Primary Key"
                    >
                      PK
                    </button>

                    {/* FK */}
                    <button
                      type="button"
                      onClick={() => handleUpdateColumn(col.id, { isForeignKey: !col.isForeignKey })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        col.isForeignKey
                          ? 'bg-cyan-500 text-black shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                      title="Foreign Key"
                    >
                      FK
                    </button>

                    {/* UQ */}
                    <button
                      type="button"
                      onClick={() => handleUpdateColumn(col.id, { isUnique: !col.isUnique })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        col.isUnique
                          ? 'bg-violet-500 text-white shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                      title="Unique Constraint"
                    >
                      UQ
                    </button>

                    {/* IDX */}
                    <button
                      type="button"
                      onClick={() => handleUpdateColumn(col.id, { isIndexed: !col.isIndexed })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        col.isIndexed
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                      title="Add Database Index"
                    >
                      IDX
                    </button>

                    {/* Nullable */}
                    <label
                      className="flex items-center gap-1 text-[10px] text-slate-400 pl-1 cursor-pointer"
                      title="Allow NULL values"
                    >
                      <input
                        type="checkbox"
                        checked={col.isNullable}
                        onChange={(e) => handleUpdateColumn(col.id, { isNullable: e.target.checked })}
                        className="rounded accent-brand"
                      />
                      <span>NULL</span>
                    </label>
                  </div>

                  {/* Default Value */}
                  <div className="w-[110px]">
                    <input
                      type="text"
                      value={col.defaultValue || ''}
                      onChange={(e) => handleUpdateColumn(col.id, { defaultValue: e.target.value })}
                      className="w-full bg-[#191c2c] border border-white/10 rounded px-2 py-1.5 font-mono text-xs text-slate-300 focus:outline-none focus:border-brand"
                      placeholder="default"
                    />
                  </div>

                  {/* Delete Col */}
                  <button
                    type="button"
                    onClick={() => handleDeleteColumn(col.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#141724]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-lg shadow-brand/20 transition-all"
            >
              Save Table Schema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
