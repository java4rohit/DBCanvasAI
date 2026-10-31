import React from 'react';
import { Database, Plus, GripVertical } from 'lucide-react';
import type { Table, Column, TableColor, RequirementItem } from '../../types/schema';
import { ColumnEditor } from './ColumnEditor';
import { RequirementsPanel } from './RequirementsPanel';
import { TableHeader, UniqueTogether } from './TableHeader';

interface RightPanelProps {
  selectedTable: Table | null;
  allTables: Table[];
  functional: RequirementItem[];
  nonFunctional: RequirementItem[];
  onUpdateTable: (updated: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onDragTableCard: (e: React.DragEvent) => void;
  onClickAddTable: () => void;
  onAddFunctional: () => void;
  onChangeFunctional: (id: string, text: string) => void;
  onDeleteFunctional: (id: string) => void;
  onAddNonFunctional: () => void;
  onChangeNonFunctional: (id: string, text: string) => void;
  onDeleteNonFunctional: (id: string) => void;
  onCreateRelation?: (srcTblId: string, srcColId: string, tgtTblId: string, tgtColId: string) => void;
  onDeleteRelationByCol?: (srcTblId: string, srcColId: string) => void;
}

export const RightPanel: React.FC<RightPanelProps & { width?: number }> = ({
  selectedTable, allTables, functional, nonFunctional,
  onUpdateTable, onDeleteTable, onDragTableCard, onClickAddTable,
  onAddFunctional, onChangeFunctional, onDeleteFunctional,
  onAddNonFunctional, onChangeNonFunctional, onDeleteNonFunctional,
  onCreateRelation, onDeleteRelationByCol, width = 340,
}) => {

  const handleColumnChange = (colId: string, updates: Partial<Column>) => {
    if (!selectedTable) return;
    onUpdateTable({
      ...selectedTable,
      columns: selectedTable.columns.map((c) => c.id === colId ? { ...c, ...updates } : c),
    });
  };

  const handleColumnDelete = (colId: string) => {
    if (!selectedTable) return;
    if (selectedTable.columns.length <= 1) { alert('A table must have at least one column.'); return; }
    onUpdateTable({ ...selectedTable, columns: selectedTable.columns.filter((c) => c.id !== colId) });
  };

  const handleAddColumn = () => {
    if (!selectedTable) return;
    const newCol: Column = {
      id: `col_${Date.now()}`, name: 'new_column', type: 'VARCHAR', typeArgs: '255',
      isPrimaryKey: false, isForeignKey: false, isNullable: true, isUnique: false, isIndexed: false,
    };
    onUpdateTable({ ...selectedTable, columns: [...selectedTable.columns, newCol] });
  };

  return (
    <aside className="h-full flex flex-col z-10 overflow-hidden" style={{ width: `${width}px`, minWidth: `${width}px`, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}>
      {/* Drag-to-add Table Card */}
      <div
        draggable
        onDragStart={onDragTableCard}
        onClick={onClickAddTable}
        className="m-3 flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing group"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-input)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
          <Database size={18} />
        </div>
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Table</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Drag onto the canvas, or click to add</div>
        </div>
        <GripVertical size={14} className="ml-auto transition-colors" style={{ color: 'var(--text-dim)' }} />
      </div>

      {/* Table Editor or empty state */}
      {selectedTable ? (
        <div className="flex-1 overflow-y-auto">
          <TableHeader
            table={selectedTable}
            onNameChange={(name) => onUpdateTable({ ...selectedTable, name: name.toLowerCase().replace(/\s+/g, '_') })}
            onColorChange={(color: TableColor) => onUpdateTable({ ...selectedTable, color })}
            onDelete={() => onDeleteTable(selectedTable.id)}
          />
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>COLUMNS</label>
              <button onClick={handleAddColumn} className="flex items-center gap-1 text-[11px] transition-colors" style={{ color: 'var(--brand)' }}>
                <Plus size={12} /> Add
              </button>
            </div>
            {selectedTable.columns.map((col) => (
              <ColumnEditor key={col.id} col={col} currentTableId={selectedTable.id} allTables={allTables} onChange={handleColumnChange} onDelete={handleColumnDelete} onCreateRelation={onCreateRelation} onDeleteRelation={onDeleteRelationByCol} />
            ))}
            <UniqueTogether
              columns={selectedTable.columns}
              constraints={selectedTable.uniqueTogether ?? []}
              onSave={(c) => onUpdateTable({ ...selectedTable, uniqueTogether: c })}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <Database size={18} style={{ color: 'var(--text-dim)' }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select a table on the canvas to edit its columns and properties.</p>
          </div>
        </div>
      )}

      {/* Requirements panel always at bottom */}
      <RequirementsPanel
        functional={functional} nonFunctional={nonFunctional}
        onAddFunctional={onAddFunctional} onChangeFunctional={onChangeFunctional} onDeleteFunctional={onDeleteFunctional}
        onAddNonFunctional={onAddNonFunctional} onChangeNonFunctional={onChangeNonFunctional} onDeleteNonFunctional={onDeleteNonFunctional}
      />
    </aside>
  );
};
