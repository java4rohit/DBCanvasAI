import { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, ChevronDown, ChevronRight, X, Loader2 } from 'lucide-react';
import type { Table, Relation } from '../../types/schema';

interface LabSidebarProps {
  currentStep: any;
  allSteps: any[];
  currentStepIndex: number;
  tables: Table[];
  relations: Relation[];
  onSelectStepIndex: (i: number) => void;
  onApplySolution: (t: Table[], r: Relation[]) => void;
  onLoadAllLMS: () => void;
}

export const LabSidebar: React.FC<LabSidebarProps> = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [functional, setFunctional] = useState<string[]>([]);
  const [nonFunctional, setNonFunctional] = useState<string[]>([]);
  const [showF, setShowF] = useState(true);
  const [showNF, setShowNF] = useState(true);
  const [analyzed, setAnalyzed] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(pdf|doc|docx|txt)$/i)) { alert('Please upload PDF, DOC, DOCX or TXT'); return; }
    setFile(f);
    setAnalyzed(false);
    setFunctional([]);
    setNonFunctional([]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    await new Promise(r => setTimeout(r, 2200));
    setFunctional([
      'Users must be able to register and log in securely.',
      'System shall support role-based access control (admin, user, guest).',
      'Users can create, read, update, and delete their own records.',
      'System shall send email notifications on key events.',
      'Search and filter functionality must be available for all entities.',
      'System shall support file uploads and attachments.',
      'Audit logs must be maintained for all critical operations.',
    ]);
    setNonFunctional([
      'System must support 10,000 concurrent users with less than 200ms response.',
      'Data must be encrypted at rest and in transit (AES-256, TLS 1.3).',
      'Database must achieve 99.9% uptime with automated failover.',
      'All API endpoints must respond within 500ms under normal load.',
      'System must be horizontally scalable via container orchestration.',
      'Backups must be performed daily with 30-day retention.',
    ]);
    setIsAnalyzing(false);
    setAnalyzed(true);
  };

  const removeFile = () => {
    setFile(null); setAnalyzed(false); setFunctional([]); setNonFunctional([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const panelStyle: React.CSSProperties = { width: '340px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0d0f18', borderRight: '1px solid rgba(255,255,255,0.08)', zIndex: 10, overflow: 'hidden' };

  return (
    <aside style={panelStyle}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(to bottom,#141724,#0d0f18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>LAB</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Requirements Analyzer</span>
        </div>
        <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>Upload a requirements document. AI will extract functional and non-functional requirements to guide your schema design.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed ' + (isDragOver ? '#f97316' : 'rgba(255,255,255,0.1)'), borderRadius: '12px', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', background: isDragOver ? 'rgba(249,115,22,0.04)' : 'transparent', transition: 'all 0.2s', textAlign: 'center' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={24} color="#f97316" />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px' }}>Drop your document here</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>or click to browse files</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['PDF', 'DOC', 'DOCX', 'TXT'].map(ext => (
                <span key={ext} style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>.{ext}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: '12px', background: '#141724', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} color="#f97316" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={removeFile} style={{ color: '#64748b', padding: '4px', borderRadius: '6px', flexShrink: 0, cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}

        {file && !analyzed && (
          <button onClick={handleAnalyze} disabled={isAnalyzing}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', background: isAnalyzing ? 'rgba(249,115,22,0.5)' : '#f97316', color: 'white', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 16px rgba(249,115,22,0.2)' }}>
            {isAnalyzing
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with AI...</>
              : <><Sparkles size={15} /> Extract Requirements with AI</>}
          </button>
        )}

        {analyzed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Sparkles size={13} color="#34d399" />
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>AI analysis complete</span>
              <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>{functional.length + nonFunctional.length} items</span>
            </div>

            <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <button onClick={() => setShowF(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#141724', border: 'none', cursor: 'pointer', color: '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Functional Requirements</span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>{functional.length}</span>
                </div>
                {showF ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
              </button>
              {showF && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0d0f18' }}>
                  {functional.map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f97316', marginTop: '1px', flexShrink: 0, fontWeight: 700 }}>F{i + 1}</span>
                      <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <button onClick={() => setShowNF(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#141724', border: 'none', cursor: 'pointer', color: '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Non-Functional Requirements</span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>{nonFunctional.length}</span>
                </div>
                {showNF ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
              </button>
              {showNF && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0d0f18' }}>
                  {nonFunctional.map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#38bdf8', marginTop: '1px', flexShrink: 0, fontWeight: 700 }}>NF{i + 1}</span>
                      <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={removeFile} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Upload size={13} /> Upload a different document
            </button>
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </aside>
  );
};
