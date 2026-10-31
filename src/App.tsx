import { useState, useEffect, useRef } from 'react';
import type { Table, Relation, RequirementItem } from './types/schema';
import { LMS_LAB_STEPS } from './data/lmsLabSteps';
import { COMPLETE_LMS_TEMPLATE } from './data/templates';
import type { SchemaTemplate } from './data/templates';
import { Canvas } from './components/Canvas/Canvas';
import { LabSidebar } from './components/Lab/LabSidebar';
import { Navbar } from './components/Navigation/Navbar';
import { AddTableModal } from './components/Modals/AddTableModal';
import { SQLPanel } from './components/SQLGenerator/SQLPanel';
import { RightPanel } from './components/RightPanel/RightPanel';
import { NewProjectScreen } from './components/NewProject/NewProjectScreen';
import { ThemeProvider } from './context/ThemeContext';

interface Snap { tables: Table[]; relations: Relation[]; }

function AppInner() {
  const [showNewProject, setShowNewProject] = useState(true);
  const [mode, setMode] = useState<'lab' | 'freeform'>('freeform');
  const [stepIdx, setStepIdx] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const [functional, setFunctional] = useState<RequirementItem[]>([]);
  const [nonFunctional, setNonFunctional] = useState<RequirementItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isSQLOpen, setIsSQLOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number }>({ x: 200, y: 200 });
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(340);

  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);
  const resizeStartRef = useRef<{ x: number; w: number }>({ x: 0, w: 0 });

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartRef.current.x;
      if (resizing === 'left') {
        setLeftWidth(Math.min(Math.max(resizeStartRef.current.w + delta, 180), 520));
      } else {
        setRightWidth(Math.min(Math.max(resizeStartRef.current.w - delta, 200), 560));
      }
    };
    const onUp = () => setResizing(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, w: leftWidth };
    setResizing('left');
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, w: rightWidth };
    setResizing('right');
  };

  const commit = (t: Table[], r: Relation[]) => {
    setPast(p => [...p, { tables, relations }]);
    setFuture([]);
    setTables(t);
    setRelations(r);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture(f => [{ tables, relations }, ...f]);
    setPast(p => p.slice(0, -1));
    setTables(prev.tables);
    setRelations(prev.relations);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(p => [...p, { tables, relations }]);
    setFuture(f => f.slice(1));
    setTables(next.tables);
    setRelations(next.relations);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const m = e.metaKey || e.ctrlKey;
      if (m && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (m && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;

  const handleAutoArrange = () => {
    const cols = 4, sx = 360, sy = 320;
    commit(tables.map((t, i) => ({ ...t, position: { x: 60 + (i % cols) * sx, y: 80 + Math.floor(i / cols) * sy } })), relations);
  };

  const handleChangeRelationType = (relId: string, type: '1:1' | '1:N' | 'N:M') => {
    commit(tables, relations.map(r => r.id === relId ? { ...r, type } : r));
  };

  const handleCreateRelation = (sTblId: string, sColId: string, tTblId: string, tColId: string) => {
    const exists = relations.some(r =>
      (r.sourceTableId===sTblId && r.sourceColumnId===sColId && r.targetTableId===tTblId && r.targetColumnId===tColId) ||
      (r.sourceTableId===tTblId && r.sourceColumnId===tColId && r.targetTableId===sTblId && r.targetColumnId===sColId)
    );
    if (exists) return;
    const newRel: Relation = { id: `rel_${Date.now()}`, sourceTableId: sTblId, sourceColumnId: sColId, targetTableId: tTblId, targetColumnId: tColId, type: '1:N', onDelete: 'CASCADE' };
    const tgt = tables.find(t => t.id === tTblId);
    const tgtCol = tgt?.columns.find(c => c.id === tColId);
    const updT = tables.map(t => t.id !== sTblId ? t : { ...t, columns: t.columns.map(c => c.id !== sColId ? c : { ...c, isForeignKey: true, references: { tableId: tTblId, columnId: tColId, tableName: tgt?.name, columnName: tgtCol?.name } }) });
    commit(updT, [...relations, newRel]);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ tables, relations }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'schema.json' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try { const p = JSON.parse(e.target?.result as string); if (Array.isArray(p.tables)) commit(p.tables, p.relations || []); else alert('Invalid schema file.'); }
      catch { alert('Failed to parse JSON.'); }
    };
    reader.readAsText(file);
  };

  const mkReq = (): RequirementItem => ({ id: `req_${Date.now()}`, text: '' });
  const step = LMS_LAB_STEPS[stepIdx] || LMS_LAB_STEPS[0];

  if (showNewProject) {
    return (
      <NewProjectScreen onStart={(name) => {
        setProjectName(name);
        setTables([]);
        setRelations([]);
        setPast([]);
        setFuture([]);
        setShowNewProject(false);
      }} />
    );
  }

  return (
    <div className="app-root">
      <Navbar
        mode={mode} onToggleMode={setMode}
        onOpenAddTable={() => setIsAddTableOpen(true)} onOpenSQL={() => setIsSQLOpen(true)}
        onAutoArrange={handleAutoArrange} onSelectTemplate={(tmpl: SchemaTemplate) => { commit(tmpl.tables, tmpl.relations); setSelectedTableId(null); setSelectedRelationId(null); }}
        onExportJson={handleExportJson} onImportJson={handleImportJson}
        tableCount={tables.length} relationCount={relations.length}
        projectName={projectName} onProjectNameChange={setProjectName}
        canUndo={past.length > 0} canRedo={future.length > 0}
        onUndo={undo} onRedo={redo}
        onNewProject={() => setShowNewProject(true)}
      />
      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative', cursor: resizing ? 'col-resize' : 'default', userSelect: resizing ? 'none' : 'auto' }}>
        {mode === 'lab' && (
          <div style={{ display:'flex', flexShrink:0 }}>
            <LabSidebar currentStep={step} allSteps={LMS_LAB_STEPS} currentStepIndex={stepIdx}
              tables={tables} relations={relations} onSelectStepIndex={setStepIdx}
              onApplySolution={(st, sr) => { if (st.length > 0) commit(st, sr); }}
              onLoadAllLMS={() => commit(COMPLETE_LMS_TEMPLATE.tables, COMPLETE_LMS_TEMPLATE.relations)}
              width={leftWidth} />
            {/* Left resize handle */}
            <div onMouseDown={startResizeLeft}
              style={{ width: 6, flexShrink: 0, cursor: 'col-resize', zIndex: 30, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: resizing === 'left' ? 'var(--brand-subtle)' : 'var(--border-subtle)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand)')}
              onMouseLeave={e => (e.currentTarget.style.background = resizing === 'left' ? 'var(--brand)' : 'var(--border-subtle)')}>
              {/* Grip dots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-dim)' }} />)}
              </div>
            </div>
          </div>
        )}
        <Canvas tables={tables} relations={relations} selectedTableId={selectedTableId} selectedRelationId={selectedRelationId}
          onSelectTable={setSelectedTableId} onSelectRelation={setSelectedRelationId}
          onUpdateTablePosition={(id, pos) => setTables(prev => prev.map(t => t.id === id ? { ...t, position: pos } : t))}
          onEditTable={(t) => setSelectedTableId(t.id)}
          onDeleteTable={(id) => { commit(tables.filter(t => t.id!==id), relations.filter(r => r.sourceTableId!==id && r.targetTableId!==id)); if(selectedTableId===id) setSelectedTableId(null); }}
          onAddColumn={(id) => setSelectedTableId(id)}
          onUpdateTable={(u) => commit(tables.map(t => t.id === u.id ? u : t), relations)}
          onAddTable={() => { setDropPosition({ x: 200 + tables.length * 30, y: 200 + tables.length * 20 }); setIsAddTableOpen(true); }}
          onDropTable={(x, y) => { setDropPosition({ x, y }); setIsAddTableOpen(true); }}
          onCreateRelation={handleCreateRelation}
          onDeleteRelation={(id) => { commit(tables, relations.filter(r => r.id!==id)); if(selectedRelationId===id) setSelectedRelationId(null); }}
          onChangeRelationType={handleChangeRelationType}
          onAutoArrange={handleAutoArrange} />
        {/* Right resize handle */}
        <div onMouseDown={startResizeRight}
          style={{ width: 6, flexShrink: 0, cursor: 'col-resize', zIndex: 30, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: resizing === 'right' ? 'var(--brand)' : 'var(--border-subtle)', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand)')}
          onMouseLeave={e => (e.currentTarget.style.background = resizing === 'right' ? 'var(--brand)' : 'var(--border-subtle)')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-dim)' }} />)}
          </div>
        </div>
        <RightPanel selectedTable={selectedTable} allTables={tables} functional={functional} nonFunctional={nonFunctional} width={rightWidth}
          onUpdateTable={(u) => commit(tables.map(t => t.id===u.id ? u : t), relations)}
          onDeleteTable={(id) => { commit(tables.filter(t=>t.id!==id), relations.filter(r=>r.sourceTableId!==id&&r.targetTableId!==id)); if(selectedTableId===id) setSelectedTableId(null); }}
          onDragTableCard={(e) => { e.dataTransfer.setData('text/plain','new-table'); }}
          onClickAddTable={() => { setDropPosition({ x: 200, y: 200 }); setIsAddTableOpen(true); }}
          onCreateRelation={handleCreateRelation}
          onDeleteRelationByCol={(srcTblId, srcColId) => commit(tables, relations.filter(r => !(r.sourceTableId === srcTblId && r.sourceColumnId === srcColId)))}
          onAddFunctional={() => setFunctional(p=>[...p,mkReq()])}
          onChangeFunctional={(id,text) => setFunctional(p=>p.map(r=>r.id===id?{...r,text}:r))}
          onDeleteFunctional={(id) => setFunctional(p=>p.filter(r=>r.id!==id))}
          onAddNonFunctional={() => setNonFunctional(p=>[...p,mkReq()])}
          onChangeNonFunctional={(id,text) => setNonFunctional(p=>p.map(r=>r.id===id?{...r,text}:r))}
          onDeleteNonFunctional={(id) => setNonFunctional(p=>p.filter(r=>r.id!==id))} />
      </div>
      <AddTableModal isOpen={isAddTableOpen} onClose={() => setIsAddTableOpen(false)} defaultPosition={dropPosition} onAdd={(t) => { commit([...tables,t], relations); setSelectedTableId(t.id); }} />
      <SQLPanel isOpen={isSQLOpen} tables={tables} relations={relations} onClose={() => setIsSQLOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
