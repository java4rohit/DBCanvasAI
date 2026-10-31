import { useState } from 'react';
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

export const RightPanel: React.FC<RightPanelProps> = ({
  selectedTable, allTables, functional, nonFunctional,
  onUpdateTable, onDeleteTable, onDragTableCard, onClickAddTable,
  onAddFunctional, onChangeFunctional, onDeleteFunctional,
  onAddNonFunctional, onChangeNonFunctional, onDeleteNonFunctional,
  onCreateRelation, onDeleteRelationByCol,
}) => {
  const [uniqueTogether, setUniqueTogether] = useState<string[]>([]);

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
    <aside className="w-[340px] h-full flex flex-col bg-[#0d0f18] border-l border-white/10 z-10 overflow-hidden">
      {/* Drag-to-add Table Card */}
      <div
        draggable
        onDragStart={onDragTableCard}
        onClick={onClickAddTable}
        className="m-3 flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#141724] hover:border-brand/50 hover:bg-[#1a1e2f] transition-all cursor-grab active:cursor-grabbing group"
      >
        <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shrink-0">
          <Database size={18} />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">Table</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Drag onto the canvas, or click to add</div>
        </div>
        <GripVertical size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
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
              <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">COLUMNS</label>
              <button onClick={handleAddColumn} className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-light transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>
            {selectedTable.columns.map((col) => (
              <ColumnEditor key={col.id} col={col} currentTableId={selectedTable.id} allTables={allTables} onChange={handleColumnChange} onDelete={handleColumnDelete} onCreateRelation={onCreateRelation} onDeleteRelation={onDeleteRelationByCol} />
            ))}
            <UniqueTogether columns={selectedTable.columns} value={uniqueTogether} onChange={setUniqueTogether} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <Database size={18} className="text-slate-500" />
            </div>
            <p className="text-xs text-slate-400">Select a table on the canvas to edit its columns and properties.</p>
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
