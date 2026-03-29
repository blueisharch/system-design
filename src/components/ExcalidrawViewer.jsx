import React, { useEffect, useRef, useState } from 'react';

/**
 * ExcalidrawViewer
 *
 * Renders an Excalidraw diagram inline on a docs page.
 * The `data` prop is the raw JSON string of the .excalidraw file,
 * injected at build time by generate-docs.js.
 *
 * Props:
 *   title  — displayed above the diagram (optional)
 *   data   — raw JSON string of the .excalidraw file (required)
 */
export default function ExcalidrawViewer({ title, data }) {
  const [Excalidraw, setExcalidraw] = useState(null);
  const [elements, setElements]     = useState([]);
  const [appState, setAppState]     = useState({});
  const [files, setFiles]           = useState({});
  const [error, setError]           = useState(null);

  // Dynamically import @excalidraw/excalidraw (client-side only)
  useEffect(() => {
    import('@excalidraw/excalidraw')
      .then((mod) => setExcalidraw(() => mod.Excalidraw))
      .catch(() => setError('Failed to load Excalidraw renderer.'));
  }, []);

  // Parse the injected JSON
  useEffect(() => {
    try {
      const parsed = JSON.parse(data);
      setElements(parsed.elements  ?? []);
      setAppState(parsed.appState  ?? {});
      setFiles(parsed.files        ?? {});
    } catch {
      setError('Could not parse diagram data.');
    }
  }, [data]);

  if (error) {
    return (
      <div style={styles.error}>
        ⚠️ {error}
      </div>
    );
  }

  if (!Excalidraw) {
    return <div style={styles.loading}>Loading diagram…</div>;
  }

  return (
    <div style={styles.wrapper}>
      {title && <p style={styles.title}>{title}</p>}
      <div style={styles.canvas}>
        <Excalidraw
          initialData={{ elements, appState: { ...appState, viewModeEnabled: true }, files }}
          viewModeEnabled={true}
          zenModeEnabled={false}
          gridModeEnabled={false}
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    margin: '1.5rem 0',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--ifm-color-emphasis-300)',
  },
  title: {
    margin: 0,
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--ifm-color-emphasis-700)',
    background: 'var(--ifm-color-emphasis-100)',
    borderBottom: '1px solid var(--ifm-color-emphasis-300)',
  },
  canvas: {
    height: '480px',
    width: '100%',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--ifm-color-emphasis-500)',
    fontSize: '0.9rem',
  },
  error: {
    padding: '1rem',
    background: 'var(--ifm-color-danger-contrast-background)',
    color: 'var(--ifm-color-danger)',
    borderRadius: '6px',
    fontSize: '0.9rem',
    margin: '1rem 0',
  },
};
