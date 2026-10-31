import { useState } from 'react';
import { Database, Layers, Zap, ArrowRight, Sparkles } from 'lucide-react';

interface NewProjectScreenProps {
  onStart: (projectName: string) => void;
}

const SUGGESTIONS = [
  'E-Commerce Platform',
  'Social Network Schema',
  'Hospital Management',
  'LMS Database',
  'Banking System',
  'SaaS Multi-Tenant',
];

export const NewProjectScreen: React.FC<NewProjectScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onStart(trimmed);
  };

  const handleSuggestion = (s: string) => {
    setName(s);
  };

  return (
    <div className="np-root">
      {/* Animated background orbs */}
      <div className="np-orb np-orb-1" />
      <div className="np-orb np-orb-2" />
      <div className="np-orb np-orb-3" />

      {/* Grid overlay */}
      <div className="np-grid" />

      <div className="np-content">
        {/* Logo */}
        <div className="np-logo">
          <div className="np-logo-icon">
            <Database size={28} strokeWidth={1.5} />
          </div>
          <div className="np-logo-text">
            <span className="np-logo-brand">DB<span style={{ color: 'var(--brand)' }}>Canvas</span></span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="np-headline">
          Your visual
          <span className="np-headline-accent"> database canvas</span>
          <br />
          built for developers
        </h1>
        <p className="np-subheadline">
          Start a new project — name it, drag tables onto the canvas, draw relations, and export production-ready SQL in seconds.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="np-form">
          <div className={`np-input-wrap ${focused ? 'np-input-wrap--focused' : ''}`}>
            <Sparkles size={16} className="np-input-icon" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Project name, e.g. E-Commerce Platform…"
              className="np-input"
              autoFocus
              required
            />
          </div>

          <button type="submit" className="np-btn-start" disabled={!name.trim()}>
            <span>Start Designing</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Suggestions */}
        <div className="np-suggestions">
          <span className="np-suggestions-label">Quick start:</span>
          <div className="np-suggestions-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestion(s)}
                className="np-chip"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="np-features">
          <div className="np-feature">
            <div className="np-feature-icon">
              <Layers size={18} />
            </div>
            <div>
              <div className="np-feature-title">Visual Canvas</div>
              <div className="np-feature-desc">Drag & drop tables, draw relations</div>
            </div>
          </div>
          <div className="np-feature">
            <div className="np-feature-icon">
              <Database size={18} />
            </div>
            <div>
              <div className="np-feature-title">SQL Export</div>
              <div className="np-feature-desc">Generate production DDL instantly</div>
            </div>
          </div>
          <div className="np-feature">
            <div className="np-feature-icon">
              <Zap size={18} />
            </div>
            <div>
              <div className="np-feature-title">Smart Templates</div>
              <div className="np-feature-desc">14+ guided schema blueprints</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
