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
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-white/5 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {items.length === 0 && (
            <p className="text-[10px] text-slate-500 italic">No requirements added yet.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-1.5">
              <span className="text-slate-500 mt-1.5 shrink-0 text-[10px]">•</span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => onChange(item.id, e.target.value)}
                className="flex-1 bg-[#191c2c] border border-white/10 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-brand"
                placeholder="Enter requirement..."
              />
              <button
                onClick={() => onDelete(item.id)}
                className="text-slate-600 hover:text-red-400 transition-colors mt-1 shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-light transition-colors mt-1"
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
    <div className="border-t border-white/10 mt-auto">
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
