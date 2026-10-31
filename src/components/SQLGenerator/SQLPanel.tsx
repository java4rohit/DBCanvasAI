import { useState } from 'react';
import type { Table, Relation } from '../../types/schema';
import {
  type Dialect,
  generatePostgreSql,
  generateMySql,
  generatePrisma,
  generateDbml,
  generateMermaid,
  simulateExplain,
  type ExplainSimulationResult,
} from '../../utils/sqlGenerator';
import { Copy, Check, Download, X, Terminal, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SQLPanelProps {
  isOpen: boolean;
  tables: Table[];
  relations: Relation[];
  onClose: () => void;
}

export const SQLPanel: React.FC<SQLPanelProps> = ({ isOpen, tables, relations, onClose }) => {
  const [selectedDialect, setSelectedDialect] = useState<Dialect | 'explain'>('postgresql');
  const [copied, setCopied] = useState(false);

  // Explain simulation state
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
  const [selectedColumnName, setSelectedColumnName] = useState<string>(
    tables[0]?.columns[0]?.name || ''
  );

  if (!isOpen) return null;

  const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  let generatedCode = '';
  switch (selectedDialect) {
    case 'postgresql':
      generatedCode = generatePostgreSql(tables, relations);
      break;
    case 'mysql':
      generatedCode = generateMySql(tables, relations);
      break;
    case 'prisma':
      generatedCode = generatePrisma(tables, relations);
      break;
    case 'dbml':
      generatedCode = generateDbml(tables, relations);
      break;
    case 'mermaid':
      generatedCode = generateMermaid(tables, relations);
      break;
    default:
      generatedCode = '';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      postgresql: 'postgres.sql',
      mysql: 'mysql.sql',
      prisma: 'schema.prisma',
      dbml: 'schema.dbml',
      mermaid: 'diagram.mmd',
    };
    const filename = extMap[selectedDialect] || 'schema.sql';
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const explainResult: ExplainSimulationResult | null =
    currentTable && selectedColumnName
      ? simulateExplain(currentTable, selectedColumnName)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              <Terminal size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>Schema Export & Query Simulator</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Production DDL, ORM mappings, and database query plan cost analyzer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDialect !== 'explain' && (
              <>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors shadow-md"
                  style={{ background: 'var(--brand)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
                >
                  <Download size={14} /> Download File
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors ml-2" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dialect Tabs */}
        <div className="flex px-6 gap-1 overflow-x-auto text-xs font-mono" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          {(
            [
              { id: 'postgresql', label: 'PostgreSQL DDL' },
              { id: 'mysql', label: 'MySQL DDL' },
              { id: 'prisma', label: 'Prisma Schema' },
              { id: 'dbml', label: 'DBML' },
              { id: 'mermaid', label: 'Mermaid ERD' },
              { id: 'explain', label: '⚡ EXPLAIN Simulator' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDialect(tab.id)}
              className="py-3 px-4 font-medium transition-colors border-b-2 flex items-center gap-1.5"
              style={selectedDialect === tab.id
                ? { borderColor: 'var(--brand)', color: 'var(--brand)', fontWeight: 600 }
                : { borderColor: 'transparent', color: 'var(--text-muted)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden p-6" style={{ background: 'var(--bg-dark)' }}>
          {selectedDialect !== 'explain' ? (
            <div className="h-full rounded-xl p-4 overflow-auto font-mono text-xs leading-relaxed custom-scrollbar" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
              {/* Controls */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Select Table to Inspect:
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value);
                      const t = tables.find((tab) => tab.id === e.target.value);
                      if (t && t.columns[0]) {
                        setSelectedColumnName(t.columns[0].name);
                      }
                    }}
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.columns.length} columns)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Lookup Column (WHERE condition):
                  </label>
                  <select
                    value={selectedColumnName}
                    onChange={(e) => setSelectedColumnName(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
                  >
                    {currentTable?.columns.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.type}) {c.isPrimaryKey ? '★ PK' : c.isIndexed ? '⚡ IDX' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulation Output Card */}
              {explainResult && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg font-mono text-xs" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>EXPLAIN ANALYZE:</span> {explainResult.query}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Access Method</div>
                      <div className={`text-sm font-bold font-mono ${explainResult.hasIndex ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {explainResult.scanType}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Execution Time (Simulated)</div>
                      <div className="text-sm font-bold font-mono flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                        <Zap size={14} className={explainResult.hasIndex ? 'text-emerald-400' : 'text-amber-400'} />
                        {explainResult.executionTimeMs} ms
                      </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Optimizer Cost Estimate</div>
                      <div className="text-sm font-bold font-mono text-cyan-400">
                        {explainResult.estimatedCost}
                      </div>
                    </div>
                  </div>

                  <div
                    className="p-4 rounded-xl border flex items-start gap-3"
                    style={explainResult.verdict === 'EXCELLENT'
                      ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#6ee7b7' }
                      : { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    {explainResult.verdict === 'EXCELLENT' ? (
                      <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-xs mb-1 tracking-wide">
                        {explainResult.verdict}: {explainResult.scanType}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {explainResult.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
