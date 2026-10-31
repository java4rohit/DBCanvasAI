import { useState } from 'react';
import type { Table, TableColor } from '../../types/schema';
import { X, Database } from 'lucide-react';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (table: Table) => void;
  defaultPosition?: { x: number; y: number };
}

const TABLE_COLORS: TableColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

export const AddTableModal: React.FC<AddTableModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  defaultPosition = { x: 250, y: 200 },
}) => {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [color, setColor] = useState<TableColor>('blue');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!formattedName) return;

    const newTable: Table = {
      id: `tbl_${Date.now()}`,
      name: formattedName,
      comment: comment.trim() || undefined,
      color,
      position: defaultPosition,
      columns: [
        {
          id: `col_${Date.now()}_id`,
          name: 'id',
          type: 'UUID',
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
          isIndexed: true,
        },
      ],
    };

    onAdd(newTable);
    setName('');
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              <Database size={16} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Add New Table</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Table Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
              placeholder="e.g. users, courses, invoices"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Category Color</label>
            <div className="flex items-center gap-2">
              {TABLE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
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
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Description (Optional)</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
              placeholder="e.g. Student progress and video playback states"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-white text-xs font-semibold transition-colors"
              style={{ background: 'var(--brand)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
            >
              Create Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
