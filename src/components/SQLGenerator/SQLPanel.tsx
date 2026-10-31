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
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col bg-[#0e101a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141724]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
              <Terminal size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Schema Export & Query Simulator</h3>
              <p className="text-xs text-slate-400">
                Production DDL, ORM mappings, and database query plan cost analyzer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDialect !== 'explain' && (
              <>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-xs font-medium text-white transition-colors shadow-md"
                >
                  <Download size={14} /> Download File
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dialect Tabs */}
        <div className="flex border-b border-white/10 bg-[#10121d] px-6 gap-1 overflow-x-auto text-xs font-mono">
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
              className={`py-3 px-4 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                selectedDialect === tab.id
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden p-6 bg-[#0a0b10]">
          {selectedDialect !== 'explain' ? (
            <div className="h-full rounded-xl bg-[#0d0f18] border border-white/5 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed custom-scrollbar">
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
              {/* Controls */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#141724] border border-white/10">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
                    className="w-full bg-[#1b1f30] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.columns.length} columns)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Lookup Column (WHERE condition):
                  </label>
                  <select
                    value={selectedColumnName}
                    onChange={(e) => setSelectedColumnName(e.target.value)}
                    className="w-full bg-[#1b1f30] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand"
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
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-slate-300">
                    <span className="text-slate-500">EXPLAIN ANALYZE:</span> {explainResult.query}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#141724] border border-white/5">
                      <div className="text-[11px] text-slate-400 mb-1">Access Method</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          explainResult.hasIndex ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {explainResult.scanType}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#141724] border border-white/5">
                      <div className="text-[11px] text-slate-400 mb-1">Execution Time (Simulated)</div>
                      <div className="text-sm font-bold font-mono text-white flex items-center gap-1.5">
                        <Zap size={14} className={explainResult.hasIndex ? 'text-emerald-400' : 'text-amber-400'} />
                        {explainResult.executionTimeMs} ms
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#141724] border border-white/5">
                      <div className="text-[11px] text-slate-400 mb-1">Optimizer Cost Estimate</div>
                      <div className="text-sm font-bold font-mono text-cyan-300">
                        {explainResult.estimatedCost}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      explainResult.verdict === 'EXCELLENT'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-red-950/20 border-red-500/30 text-red-200'
                    }`}
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
                      <div className="text-xs text-slate-300 leading-relaxed">
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
