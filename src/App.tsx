import { useState, useEffect, useRef, useCallback } from 'react';
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
import { ProjectsSidebar } from './components/Projects/ProjectsSidebar';
import { ThemeProvider } from './context/ThemeContext';
import {
  getAllProjects, saveProject, deleteProject,
  getActiveProjectId, setActiveProjectId, createNewProject,
} from './hooks/useProjectDB';
import type { Project } from './hooks/useProjectDB';

interface Snap { tables: Table[]; relations: Relation[]; }

function AppInner() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [mode, setMode] = useState<'lab' | 'freeform'>('freeform');
  const [stepIdx, setStepIdx] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const [functional, setFunctional] = useState<RequirementItem[]>([]);
  const [nonFunctional, setNonFunctional] = useState<RequirementItem[]>([]);
  const [labDocumentName, setLabDocumentName] = useState<string | null>(null);
  const [labCollapsed, setLabCollapsed] = useState(false);
  const labDocumentNameRef = useRef<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isSQLOpen, setIsSQLOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number }>({ x: 200, y: 200 });
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(340);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveProjectIdRef = useRef<string | null>(null);

  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);
  const resizeStartRef = useRef<{ x: number; w: number }>({ x: 0, w: 0 });

  // ── Load all projects from IndexedDB on mount ──────────────────────────
  useEffect(() => {
    (async () => {
      const all = await getAllProjects();
      setProjects(all);
      const activeId = getActiveProjectId();
      if (all.length === 0) { setShowNewProject(true); setDbReady(true); return; }
      const active = all.find(p => p.id === activeId) ?? all[0];
      loadProjectIntoState(active);
      setDbReady(true);
    })();
  }, []);

  const loadProjectIntoState = (p: Project) => {
    setActiveProjectIdState(p.id);
    setActiveProjectId(p.id);
    setProjectName(p.name);
    setTables(p.tables);
    setRelations(p.relations);
    setFunctional(p.functional);
    setNonFunctional(p.nonFunctional);
    const docName = p.labDocumentName ?? null;
    setLabDocumentName(docName);
    labDocumentNameRef.current = docName;
    setLabCollapsed(!!docName);
    setPast([]); setFuture([]);
    setSelectedTableId(null); setSelectedRelationId(null);
    setShowNewProject(false);
  };

  // ── Auto-save debounced 600ms ──────────────────────────────────────────
  const persistProject = useCallback((
    id: string, name: string, t: Table[], r: Relation[],
    fn: RequirementItem[], nfn: RequirementItem[]
  ) => {
    if (!id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const proj: Project = {
        id, name, tables: t, relations: r, functional: fn, nonFunctional: nfn,
        labDocumentName: labDocumentNameRef.current,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await saveProject(proj);
      setProjects(await getAllProjects());
    }, 600);
  }, []);

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
    if (activeProjectId) persistProject(activeProjectId, projectName, t, r, functional, nonFunctional);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture(f => [{ tables, relations }, ...f]);
    setPast(p => p.slice(0, -1));
    setTables(prev.tables);
    setRelations(prev.relations);
    if (activeProjectId) persistProject(activeProjectId, projectName, prev.tables, prev.relations, functional, nonFunctional);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(p => [...p, { tables, relations }]);
    setFuture(f => f.slice(1));
    setTables(next.tables);
    setRelations(next.relations);
    if (activeProjectId) persistProject(activeProjectId, projectName, next.tables, next.relations, functional, nonFunctional);
  };

  // Save when project name changes (but not when we just switched to a different project —
  // that would bump updatedAt and reorder the Projects sidebar just from selecting it)
  useEffect(() => {
    const justSwitchedProject = prevActiveProjectIdRef.current !== activeProjectId;
    prevActiveProjectIdRef.current = activeProjectId;
    if (justSwitchedProject) return;
    if (activeProjectId && dbReady && projectName) {
      persistProject(activeProjectId, projectName, tables, relations, functional, nonFunctional);
    }
  }, [projectName]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const m = e.metaKey || e.ctrlKey;
      if (m && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (m && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedRelationId) {
        const target = e.target as HTMLElement | null;
        const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          commit(tables, relations.filter(r => r.id !== selectedRelationId));
          setSelectedRelationId(null);
        }
      }
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
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${projectName || 'schema'}.json` });
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

  // ── Project management ─────────────────────────────────────────────────
  const handleStartNewProject = async (name: string) => {
    const proj = createNewProject(name);
    await saveProject(proj);
    const all = await getAllProjects();
    setProjects(all);
    loadProjectIntoState(proj);
  };

  const handleSelectProject = (p: Project) => loadProjectIntoState(p);

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    const all = await getAllProjects();
    setProjects(all);
    if (id === activeProjectId) {
      if (all.length > 0) loadProjectIntoState(all[0]);
      else { setActiveProjectIdState(null); setActiveProjectId(null); setShowNewProject(true); }
    }
  };

  const mkReq = (): RequirementItem => ({ id: `req_${Date.now()}`, text: '' });
  const step = LMS_LAB_STEPS[stepIdx] || LMS_LAB_STEPS[0];

  const handleLabExtracted = (newFunctional: RequirementItem[], newNonFunctional: RequirementItem[], documentName: string) => {
    const f = [...functional, ...newFunctional];
    const nf = [...nonFunctional, ...newNonFunctional];
    setFunctional(f);
    setNonFunctional(nf);
    setLabDocumentName(documentName);
    labDocumentNameRef.current = documentName;
    if (activeProjectId) persistProject(activeProjectId, projectName, tables, relations, f, nf);
    setLabCollapsed(true);
  };

  // ── Loading spinner ────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-dark)', flexDirection:'column', gap:12 }}>
        <div style={{ width:32, height:32, border:'3px solid var(--border-subtle)', borderTopColor:'var(--brand)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <span style={{ color:'var(--text-muted)', fontSize:13 }}>Loading projects…</span>
      </div>
    );
  }

  if (showNewProject) {
    return (
      <NewProjectScreen
        onStart={handleStartNewProject}
        hasExistingProjects={projects.length > 0}
        onBack={projects.length > 0 ? () => {
          const active = projects.find(p => p.id === activeProjectId) ?? projects[0];
          if (active) loadProjectIntoState(active);
        } : undefined}
      />
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

        {/* ── Projects Sidebar ── */}
        <ProjectsSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onNewProject={() => setShowNewProject(true)}
          onDeleteProject={handleDeleteProject}
        />

        {mode === 'lab' && (
          <div style={{ display:'flex', flexShrink:0 }}>
            <LabSidebar currentStep={step} allSteps={LMS_LAB_STEPS} currentStepIndex={stepIdx}
              tables={tables} relations={relations} onSelectStepIndex={setStepIdx}
              onApplySolution={(st, sr) => { if (st.length > 0) commit(st, sr); }}
              onLoadAllLMS={() => commit(COMPLETE_LMS_TEMPLATE.tables, COMPLETE_LMS_TEMPLATE.relations)}
              documentName={labDocumentName}
              collapsed={labCollapsed}
              onToggleCollapsed={() => setLabCollapsed(c => !c)}
              onExtracted={handleLabExtracted}
              width={labCollapsed ? 44 : leftWidth} />
            {/* Left resize handle */}
            {!labCollapsed && (
              <div onMouseDown={startResizeLeft}
                style={{ width: 6, flexShrink: 0, cursor: 'col-resize', zIndex: 30, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: resizing === 'left' ? 'var(--brand-subtle)' : 'var(--border-subtle)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand)')}
                onMouseLeave={e => (e.currentTarget.style.background = resizing === 'left' ? 'var(--brand)' : 'var(--border-subtle)')}>
                {/* Grip dots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-dim)' }} />)}
                </div>
              </div>
            )}
          </div>
        )}
        <Canvas tables={tables} relations={relations} selectedTableId={selectedTableId} selectedRelationId={selectedRelationId}
          onSelectTable={setSelectedTableId} onSelectRelation={setSelectedRelationId}
          onUpdateTablePosition={(id, pos) => {
            const updated = tables.map(t => t.id === id ? { ...t, position: pos } : t);
            setTables(updated);
            if (activeProjectId) persistProject(activeProjectId, projectName, updated, relations, functional, nonFunctional);
          }}
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
          onAddFunctional={() => { const f=[...functional,mkReq()]; setFunctional(f); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,f,nonFunctional); }}
          onChangeFunctional={(id,text) => { const f=functional.map(r=>r.id===id?{...r,text}:r); setFunctional(f); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,f,nonFunctional); }}
          onDeleteFunctional={(id) => { const f=functional.filter(r=>r.id!==id); setFunctional(f); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,f,nonFunctional); }}
          onAddNonFunctional={() => { const nf=[...nonFunctional,mkReq()]; setNonFunctional(nf); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,functional,nf); }}
          onChangeNonFunctional={(id,text) => { const nf=nonFunctional.map(r=>r.id===id?{...r,text}:r); setNonFunctional(nf); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,functional,nf); }}
          onDeleteNonFunctional={(id) => { const nf=nonFunctional.filter(r=>r.id!==id); setNonFunctional(nf); if(activeProjectId) persistProject(activeProjectId,projectName,tables,relations,functional,nf); }} />
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
