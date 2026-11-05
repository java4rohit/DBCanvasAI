import { useRef, useState } from 'react';
import { FileCode2, Upload, X } from 'lucide-react';

interface SchemaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (source: string) => boolean;
}

export const SchemaImportModal: React.FC<SchemaImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');

  if (!isOpen) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      setSource(await file.text());
      setFileName(file.name);
      setFileError('');
    } catch (error) {
      setFileError(error instanceof Error ? `Could not read ${file.name}: ${error.message}` : `Could not read ${file.name}.`);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onImport(source)) {
      setSource('');
      setFileName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              <FileCode2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Import Database Schema</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Paste Mermaid ER code or PostgreSQL DDL, or upload a text file.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close schema import" className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="schema-source" className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Schema text</label>
            <div className="flex items-center gap-2">
              {fileName && <span className="text-xs truncate max-w-48" style={{ color: 'var(--text-muted)' }} title={fileName}>{fileName}</span>}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
              >
                <Upload size={13} /> Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mmd,.mermaid,.sql,.ddl,.md,.txt"
                className="hidden"
                onChange={event => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
          <textarea
            id="schema-source"
            value={source}
            onChange={event => { setSource(event.target.value); setFileName(''); setFileError(''); }}
            placeholder={'CREATE TABLE customers (\n  id BIGSERIAL PRIMARY KEY,\n  name VARCHAR(120) NOT NULL\n);\n\nCREATE TABLE orders (\n  id BIGSERIAL PRIMARY KEY,\n  customer_id BIGINT NOT NULL REFERENCES customers(id)\n);'}
            spellCheck={false}
            required
            className="w-full min-h-64 resize-y rounded-lg px-3 py-3 text-xs font-mono leading-5 focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
          />
          {fileError && <p role="alert" className="text-xs" style={{ color: '#f87171' }}>{fileError}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={!source.trim()} className="px-5 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--brand)' }}>
              Import Schema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
