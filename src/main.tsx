import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err: Error) { return { error: err.message + '\n' + err.stack }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0a0b10', color: '#f87171', fontFamily: 'monospace', padding: '2rem', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
          <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '16px', marginBottom: '1rem' }}>⚠ React Runtime Error</div>
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

// Catch module-level errors too
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (e: any) {
  document.getElementById('root')!.innerHTML = `<div style="background:#0a0b10;color:#f87171;font-family:monospace;padding:2rem;white-space:pre-wrap;font-size:13px"><b style="color:#f97316;font-size:16px">⚠ Top-level crash</b>\n\n${e?.message}\n\n${e?.stack}</div>`;
}
