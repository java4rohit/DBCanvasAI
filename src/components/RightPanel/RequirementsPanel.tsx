import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { RequirementItem } from '../../types/schema';

interface RequirementsSectionProps {
  title: string;
  items: RequirementItem[];
  onAdd: () => void;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

const RequirementsSection: React.FC<RequirementsSectionProps> = ({ title, items, onAdd, onChange, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {items.length === 0 && (
            <p className="text-[10px] italic" style={{ color: 'var(--text-dim)' }}>No requirements added yet.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-1.5">
              <span className="mt-1.5 shrink-0 text-[10px]" style={{ color: 'var(--text-dim)' }}>•</span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => onChange(item.id, e.target.value)}
                className="flex-1 rounded px-2 py-1 text-[11px] focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-main)' }}
                placeholder="Enter requirement..."
              />
              <button
                onClick={() => onDelete(item.id)}
                className="hover:text-red-400 transition-colors mt-1 shrink-0"
                style={{ color: 'var(--text-dim)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-[11px] transition-colors mt-1"
            style={{ color: 'var(--brand)' }}
          >
            <Plus size={12} /> Add item
          </button>
        </div>
      )}
    </div>
  );
};

interface RequirementsPanelProps {
  functional: RequirementItem[];
  nonFunctional: RequirementItem[];
  onAddFunctional: () => void;
  onChangeFunctional: (id: string, text: string) => void;
  onDeleteFunctional: (id: string) => void;
  onAddNonFunctional: () => void;
  onChangeNonFunctional: (id: string, text: string) => void;
  onDeleteNonFunctional: (id: string) => void;
}

export const RequirementsPanel: React.FC<RequirementsPanelProps> = ({
  functional,
  nonFunctional,
  onAddFunctional,
  onChangeFunctional,
  onDeleteFunctional,
  onAddNonFunctional,
  onChangeNonFunctional,
  onDeleteNonFunctional,
}) => {
  return (
    <div className="mt-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <RequirementsSection
        title="Functional requirements"
        items={functional}
        onAdd={onAddFunctional}
        onChange={onChangeFunctional}
        onDelete={onDeleteFunctional}
      />
      <RequirementsSection
        title="Non-functional requirements"
        items={nonFunctional}
        onAdd={onAddNonFunctional}
        onChange={onChangeNonFunctional}
        onDelete={onDeleteNonFunctional}
      />
    </div>
  );
};
