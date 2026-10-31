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
      <div className="relative w-full max-w-md bg-[#0e101a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141724]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
              <Database size={16} />
            </div>
            <h3 className="text-sm font-semibold text-white">Add New Table</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#191c2c] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand"
              placeholder="e.g. users, courses, invoices"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Category Color</label>
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#191c2c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
              placeholder="e.g. Student progress and video playback states"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand/20"
            >
              Create Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
