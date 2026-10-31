import { useRef, useState } from 'react';
import type { SchemaTemplate } from '../../data/templates';
import { TEMPLATES } from '../../data/templates';
import {
  Plus, Terminal, Download, Upload, Layout,
  ChevronDown, Undo2, Redo2, ChevronRight, Pencil,
  Sun, Moon, CloudMoon, Database, FolderPlus,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark',  label: 'Dark',  icon: <Moon size={14} /> },
  { value: 'night', label: 'Night', icon: <CloudMoon size={14} /> },
  { value: 'light', label: 'Light', icon: <Sun size={14} /> },
];

interface NavbarProps {
  mode: 'lab' | 'freeform';
  onToggleMode: (mode: 'lab' | 'freeform') => void;
  onOpenAddTable: () => void;
  onOpenSQL: () => void;
  onAutoArrange: () => void;
  onSelectTemplate: (template: SchemaTemplate) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  tableCount: number;
  relationCount: number;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode, onToggleMode, onOpenAddTable, onOpenSQL, onAutoArrange,
  onSelectTemplate, onExportJson, onImportJson, tableCount, relationCount,
  projectName, onProjectNameChange, canUndo, canRedo, onUndo, onRedo, onNewProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const currentThemeOption = THEME_OPTIONS.find(t => t.value === theme)!;

  return (
    <header className="navbar">
      {/* Left */}
      <div className="navbar-left">
        <div className="navbar-logo">
          <div className="navbar-logo-icon"><Database size={16} strokeWidth={1.8} /></div>
          <div className="navbar-logo-text">
            <span className="navbar-brand-main"><span className="navbar-brand-white">DB</span><span className="navbar-brand-accent">Canvas</span><span className="navbar-brand-blue">AI</span></span>
          </div>
        </div>
        <div className="navbar-divider" />
        <div className="navbar-breadcrumb">
          <span className="navbar-breadcrumb-root">Projects</span>
          <ChevronRight size={12} className="navbar-breadcrumb-sep" />
          {editingName ? (
            <input autoFocus type="text" value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="navbar-project-input" />
          ) : (
            <button onClick={() => setEditingName(true)} className="navbar-project-name group">
              <span>{projectName}</span>
              <Pencil size={11} className="navbar-project-edit-icon opacity-0 group-hover:opacity-100" />
            </button>
          )}
        </div>
        <div className="navbar-divider" />
        <div className="navbar-mode-switch">
          <button onClick={() => onToggleMode('lab')}
            className={`navbar-mode-btn ${mode === 'lab' ? 'navbar-mode-btn--active' : ''}`}>Lab Mode</button>
          <button onClick={() => onToggleMode('freeform')}
            className={`navbar-mode-btn ${mode === 'freeform' ? 'navbar-mode-btn--active-orange' : ''}`}>Free Canvas</button>
        </div>
      </div>

      {/* Center */}
      <div className="navbar-center">
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Cmd+Z)"
          className="navbar-icon-btn disabled:opacity-25 disabled:pointer-events-none"><Undo2 size={14} /></button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Cmd+Y)"
          className="navbar-icon-btn disabled:opacity-25 disabled:pointer-events-none"><Redo2 size={14} /></button>
        <div className="navbar-divider" />
        <div className="navbar-stat"><span className="navbar-stat-num">{tableCount}</span><span className="navbar-stat-label">Tables</span></div>
        <div className="navbar-stat-sep">/</div>
        <div className="navbar-stat"><span className="navbar-stat-num">{relationCount}</span><span className="navbar-stat-label">Relations</span></div>
      </div>

      {/* Right */}
      <div className="navbar-right">
        <button onClick={onNewProject} className="navbar-action-btn">
          <FolderPlus size={13} /><span>New Project</span>
        </button>

        <div className="relative group">
          <button className="navbar-action-btn"><span>Templates</span><ChevronDown size={12} /></button>
          <div className="navbar-dropdown">
            {TEMPLATES.map((tmpl) => (
              <button key={tmpl.id} onClick={() => onSelectTemplate(tmpl)} className="navbar-dropdown-item">
                <div className="navbar-dropdown-item-title">{tmpl.name}</div>
                <div className="navbar-dropdown-item-desc">{tmpl.description}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={onAutoArrange} title="Auto-Arrange" className="navbar-icon-btn"><Layout size={14} /></button>
        <button onClick={onOpenAddTable} className="navbar-add-btn"><Plus size={14} /><span>Add Table</span></button>
        <button onClick={onExportJson} title="Export JSON" className="navbar-icon-btn"><Download size={14} /></button>
        <button onClick={() => fileInputRef.current?.click()} title="Import JSON" className="navbar-icon-btn"><Upload size={14} /></button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportJson(f); e.target.value = ''; }} />

        <div className="relative">
          <button onClick={() => setThemeOpen(!themeOpen)} className="navbar-theme-btn" title="Change Theme">
            {currentThemeOption.icon}
            <ChevronDown size={11} style={{ transform: themeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {themeOpen && (
            <div className="navbar-theme-dropdown">
              {THEME_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => { setTheme(opt.value); setThemeOpen(false); }}
                  className={`navbar-theme-option ${theme === opt.value ? 'navbar-theme-option--active' : ''}`}>
                  {opt.icon}<span>{opt.label}</span>
                  {theme === opt.value && <div className="navbar-theme-dot" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onOpenSQL} className="navbar-sql-btn"><Terminal size={14} /><span>SQL & DDL</span></button>
      </div>
    </header>
  );
};
