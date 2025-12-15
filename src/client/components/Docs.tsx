import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5003/api';

type Props = { onClose: () => void };

export default function Docs({ onClose }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // (removed page-dimming) keep modal self-contained
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/docs`);
        if (!res.ok) throw new Error(`Failed to load docs: ${res.status}`);
        const text = await res.text();
        if (!cancelled) setHtml(text);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load docs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="docs-modal" role="dialog" aria-modal="true">
      <div className="docs-panel">
        <div className="docs-header">
          <h2>Documentation</h2>
          <button className="docs-close" onClick={onClose} aria-label="Close docs">✕</button>
        </div>
        <div className="docs-body">
          {loading && <div className="loading-text">Loading docs…</div>}
          {error && <div className="error-message">{error}</div>}
          {html && <div className="docs-content" dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
      </div>
    </div>
  );
}
