import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

export const RELATIONS = [
  { type: '1:1', label: 'One-to-One', color: '#10b981', emoji: '— —', example: 'User → Profile', badge: 'UNIQUE FK',
    when: 'Each record in A maps to exactly one in B.',
    howTo: ['Add FK column in child table (e.g. user_id)', 'Mark it UNIQUE', 'Drag ○ port → parent PK', 'Click line → set type 1:1'],
    sql: 'ALTER TABLE profiles ADD COLUMN user_id UUID UNIQUE REFERENCES users(id);' },
  { type: '1:N', label: 'One-to-Many', color: '#f59e0b', emoji: '——<', example: 'User → Posts', badge: 'FK',
    when: 'One record in A relates to many in B. Most common pattern.',
    howTo: ['Add FK column in "many" table (e.g. user_id in posts)', 'Drag ○ port from FK → parent PK', 'Type defaults to 1:N'],
    sql: 'ALTER TABLE posts ADD COLUMN user_id UUID REFERENCES users(id);' },
  { type: 'N:M', label: 'Many-to-Many', color: '#e879f9', emoji: '>··<', example: 'Students ↔ Courses', badge: 'Junction Table',
    when: 'Many in A relate to many in B. Requires a bridge table.',
    howTo: ['Create bridge table (e.g. student_courses)', 'Add student_id FK → drag to students.id', 'Add course_id FK → drag to courses.id', 'Set both relations N:M'],
    sql: 'CREATE TABLE student_courses (\n  student_id UUID REFERENCES students(id),\n  course_id UUID REFERENCES courses(id),\n  PRIMARY KEY (student_id, course_id)\n);' },
  { type: 'N:1', label: 'Many-to-One', color: '#f59e0b', emoji: '>——', example: 'Orders → Customer', badge: 'FK (reverse)',
    when: 'Same as 1:N viewed from the "many" side.',
    howTo: ['Add FK in "many" table (e.g. customer_id)', 'Drag ○ port from FK → parent PK', 'Same as 1:N structurally'],
    sql: 'ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);' },
];

export const RelationGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [expanded, setExpanded] = useState<string | null>('1:N');
  return (
    <div className="absolute top-16 left-4 z-30 w-80 rounded-2xl shadow-2xl flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', maxHeight: 'calc(100vh - 100px)', overflow: 'hidden' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>📐 Relation Guide</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>How to connect tables on the canvas</div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:text-red-400 transition-colors" style={{ color: 'var(--text-dim)' }}>
          <X size={15} />
        </button>
      </div>

      {/* Tip banner */}
      <div className="px-4 py-2.5 shrink-0" style={{ background: 'var(--brand-subtle)', borderBottom: '1px solid var(--brand-border)' }}>
        <p className="text-[11px] font-semibold" style={{ color: 'var(--brand)' }}>💡 How to draw a relation</p>
        <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Hover a column → <b>circle ○</b> appears on right edge → <b>drag it</b> to another table's column.
          Then click the line to change type (1:1 / 1:N / N:M).
        </p>
      </div>

      {/* Relation list */}
      <div className="overflow-y-auto flex-1">
        {RELATIONS.map(rel => {
          const isOpen = expanded === rel.type;
          return (
            <div key={rel.type} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{ background: isOpen ? 'var(--bg-elevated)' : 'transparent' }}
                onClick={() => setExpanded(isOpen ? null : rel.type)}>
                <span className="text-xl shrink-0" style={{ color: rel.color }}>{rel.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono" style={{ color: rel.color }}>{rel.type}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>{rel.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
                      style={{ background: `${rel.color}20`, color: rel.color, border: `1px solid ${rel.color}40` }}>{rel.badge}</span>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{rel.example}</div>
                </div>
                {isOpen
                  ? <ChevronUp size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  : <ChevronDown size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4" style={{ background: 'var(--bg-surface)' }}>
                  <p className="text-[11px] leading-relaxed mb-3 pt-2" style={{ color: 'var(--text-muted)' }}>{rel.when}</p>
                  <div className="mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Steps</div>
                    {rel.howTo.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${rel.color}20`, color: rel.color }}>{i + 1}</span>
                        <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>SQL Example</div>
                  <pre className="text-[10px] p-2.5 rounded-lg overflow-x-auto leading-relaxed font-mono"
                    style={{ background: 'var(--bg-dark)', color: '#10b981', border: '1px solid var(--border-subtle)' }}>{rel.sql}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
