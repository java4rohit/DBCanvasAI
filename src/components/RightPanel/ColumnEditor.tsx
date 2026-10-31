import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Column, DataType, Table } from '../../types/schema';

export const ALL_TYPES: DataType[] = [
  'UUID', 'BIGSERIAL', 'BIGINT', 'INT', 'SERIAL', 'SMALLINT',
  'VARCHAR', 'CHAR', 'TEXT', 'BOOLEAN',
  'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'TIME',
  'DECIMAL', 'NUMERIC', 'FLOAT',
  'JSONB', 'JSON', 'ENUM', 'ARRAY', 'BYTEA',
];

interface ColumnEditorProps {
  col: Column;
  currentTableId: string;
  allTables: Table[];
  onChange: (colId: string, updates: Partial<Column>) => void;
  onDelete: (colId: string) => void;
  onCreateRelation?: (srcTblId: string, srcColId: string, tgtTblId: string, tgtColId: string) => void;
  onDeleteRelation?: (srcTblId: string, srcColId: string) => void;
}

const Toggle = ({ value, onClick, label, disabled }: {
  value: boolean; onClick: () => void; label: string; disabled?: boolean;
}) => (
  <div
    className={`flex items-center gap-1.5 cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    onClick={disabled ? undefined : onClick}
  >
    <div className="w-7 h-4 rounded-full transition-colors" style={{ background: value ? 'var(--brand)' : 'var(--border-strong)' }}>
      <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

export const ColumnEditor: React.FC<ColumnEditorProps> = ({ col, currentTableId, allTables, onChange, onDelete, onCreateRelation, onDeleteRelation }) => {
  // exclude columns from the same table to avoid self-references
  const refOptions: { label: string; tableId: string; columnId: string }[] = [];
  for (const tbl of allTables) {
    if (tbl.id === currentTableId) continue;
    for (const c of tbl.columns) {
      refOptions.push({ label: `${tbl.name}.${c.name}`, tableId: tbl.id, columnId: c.id });
    }
  }

  const curRef = col.references
    ? (refOptions.find((r) => r.tableId === col.references!.tableId && r.columnId === col.references!.columnId)?.label ?? 'nothing')
    : 'nothing';

  const handleRef = (label: string) => {
    if (label === 'nothing') {
      // Remove reference and delete the visual relation line
      onChange(col.id, { references: undefined, isForeignKey: false });
      onDeleteRelation?.(currentTableId, col.id);
      return;
    }
    const opt = refOptions.find((r) => r.label === label);
    if (!opt) return;
    const tbl = allTables.find((t) => t.id === opt.tableId);
    const c = tbl?.columns.find((cc) => cc.id === opt.columnId);
    // Update column metadata
    onChange(col.id, { references: { tableId: opt.tableId, columnId: opt.columnId, tableName: tbl?.name, columnName: c?.name }, isForeignKey: true });
    // Also create the visual relation line
    onCreateRelation?.(currentTableId, col.id, opt.tableId, opt.columnId);
  };

  const inputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', width: '100%', WebkitAppearance: 'none' as const };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={col.name} onChange={(e) => onChange(col.id, { name: e.target.value })}
          className="font-mono text-xs outline-none w-full"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-main)', border: 'none' }}
          placeholder="column_name" />
        <button onClick={() => onDelete(col.id)} className="ml-2 hover:text-red-400 shrink-0" style={{ color: 'var(--text-dim)' }}>
          <Trash2 size={13} />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <Row label="Type">
          <select value={col.type} onChange={(e) => onChange(col.id, { type: e.target.value as DataType })} style={{ ...selectStyle, flex: 1 }}>
            {ALL_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
          </select>
        </Row>
        <Row label="Key">
          <select value={col.isPrimaryKey ? 'primary key' : 'none'}
            onChange={(e) => { const isPK = e.target.value === 'primary key'; onChange(col.id, { isPrimaryKey: isPK, isNullable: isPK ? false : col.isNullable, isUnique: isPK ? true : col.isUnique, isIndexed: isPK ? true : col.isIndexed }); }}
            style={{ ...selectStyle, width: 112 }}>
            <option value="none">none</option>
            <option value="primary key">primary key</option>
          </select>
          <Toggle value={col.isUnique} onClick={() => onChange(col.id, { isUnique: !col.isUnique })} label="Unique" />
          <Toggle value={col.isNullable} onClick={() => onChange(col.id, { isNullable: !col.isNullable })} label="Nullable" disabled={col.isPrimaryKey} />
        </Row>
        <Row label="References">
          <select value={curRef} onChange={(e) => handleRef(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
            <option value="nothing">nothing</option>
            {refOptions.map((r) => <option key={`${r.tableId}-${r.columnId}`} value={r.label}>{r.label}</option>)}
          </select>
        </Row>
        <Row label="Default">
          <input type="text" value={col.defaultValue ?? ''} onChange={(e) => onChange(col.id, { defaultValue: e.target.value || undefined })}
            className="font-mono" style={{ ...inputStyle, flex: 1 }} placeholder="e.g. CURRENT_TIMESTAMP" />
        </Row>
        <Row label="Indexed">
          <Toggle value={col.isIndexed} onClick={() => onChange(col.id, { isIndexed: !col.isIndexed })} label="IDX" />
        </Row>
      </div>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <label className="text-[10px] w-16 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);
