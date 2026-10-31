import { useState } from 'react';
import {
  FolderOpen, Plus, Trash2, ChevronLeft, ChevronRight,
  Clock, Database, FolderKanban,
} from 'lucide-react';
import type { Project } from '../../hooks/useProjectDB';

interface ProjectsSidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteProject(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  if (collapsed) {
    return (
      <div className="proj-sidebar proj-sidebar--collapsed">
        <button className="proj-collapse-btn" onClick={() => setCollapsed(false)} title="Expand Projects">
          <ChevronRight size={14} />
        </button>
        <div className="proj-collapsed-icons">
          <button className="proj-icon-btn" onClick={onNewProject} title="New Project">
            <Plus size={15} />
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              className={`proj-icon-btn proj-icon-btn--project ${p.id === activeProjectId ? 'proj-icon-btn--active' : ''}`}
              onClick={() => onSelectProject(p)}
              title={p.name}
            >
              <FolderOpen size={14} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="proj-sidebar">
      {/* Header */}
      <div className="proj-header">
        <div className="proj-header-left">
          <FolderKanban size={14} className="proj-header-icon" />
          <span className="proj-header-title">Projects</span>
          <span className="proj-header-count">{projects.length}</span>
        </div>
        <button className="proj-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* New Project Button */}
      <button className="proj-new-btn" onClick={onNewProject}>
        <Plus size={13} />
        <span>New Project</span>
      </button>

      {/* Project List */}
      <div className="proj-list">
        {projects.length === 0 && (
          <div className="proj-empty">
            <Database size={22} className="proj-empty-icon" />
            <span>No projects yet</span>
            <span className="proj-empty-sub">Click "New Project" to start</span>
          </div>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            className={`proj-item ${p.id === activeProjectId ? 'proj-item--active' : ''}`}
            onClick={() => onSelectProject(p)}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => { setHoveredId(null); }}
          >
            <div className="proj-item-icon">
              <FolderOpen size={13} />
            </div>
            <div className="proj-item-info">
              <div className="proj-item-name" title={p.name}>{p.name}</div>
              <div className="proj-item-meta">
                <Clock size={10} />
                <span>{timeAgo(p.updatedAt)}</span>
                <span className="proj-item-dot">·</span>
                <span>{p.tables.length} tables</span>
              </div>
            </div>
            {(hoveredId === p.id || confirmDeleteId === p.id) && (
              <button
                className={`proj-delete-btn ${confirmDeleteId === p.id ? 'proj-delete-btn--confirm' : ''}`}
                onClick={(e) => handleDelete(e, p.id)}
                title={confirmDeleteId === p.id ? 'Click again to confirm delete' : 'Delete project'}
              >
                <Trash2 size={11} />
              </button>
            )}
            {p.id === activeProjectId && (
              <div className="proj-item-active-dot" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
