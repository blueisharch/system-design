#!/usr/bin/env node
/**
 * generate-docs.js
 *
 * Crawls all topic folders for .md files, resolves any .excalidraw links
 * found inside them, injects an interactive Excalidraw viewer in their place,
 * and writes everything into docs/ for Docusaurus to build.
 *
 * Run automatically by the GitHub Actions workflow before `npm run build`.
 */

const fs   = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const REPO_ROOT   = path.resolve(__dirname, '..');
const DOCS_OUT    = path.join(REPO_ROOT, 'docs');
const DIAGRAMS_DIR = path.join(REPO_ROOT, 'diagrams');

// Top-level folders that contain .md notes (order determines sidebar order)
const TOPIC_FOLDERS = [
  '01-fundamentals',
  '02-scaling',
  '03-databases',
  '04-networking-and-routing',
  '05-caching',
  '06-async-communication',
  '07-microservices',
  '08-reliability-and-performance',
  '09-hld-case-studies',
  '10-interview-prep',
  '11-security',
  '12-modern-patterns',
  '13-multi-region',
  '14-cost-optimization',
  '15-edge-computing',
  '16-failure-resilience',
  '17-api-design-advanced',
  'patterns',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively find all .md files inside a directory */
function findMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(full);
    if (entry.isFile() && entry.name.endsWith('.md')) return [full];
    return [];
  });
}

/**
 * Given the raw markdown content and the source file path, find every link
 * that points to a .excalidraw file.
 *
 * Matches both:
 *   [label](path/to/file.excalidraw)
 *   [label](../diagrams/file.excalidraw)
 */
function findExcalidrawLinks(content) {
  const pattern = /\[([^\]]*)\]\(([^)]*\.excalidraw)\)/g;
  const matches = [];
  let m;
  while ((m = pattern.exec(content)) !== null) {
    matches.push({ full: m[0], label: m[1], href: m[2] });
  }
  return matches;
}

/**
 * Read a .excalidraw file and return its JSON content as an escaped string
 * safe to embed in a JS template literal inside MDX.
 */
function readExcalidrawJSON(excalidrawPath) {
  if (!fs.existsSync(excalidrawPath)) {
    console.warn(`  ⚠  Diagram not found: ${excalidrawPath}`);
    return null;
  }
  const raw = fs.readFileSync(excalidrawPath, 'utf8');
  // Validate it's real JSON
  try { JSON.parse(raw); } catch {
    console.warn(`  ⚠  Invalid JSON in: ${excalidrawPath}`);
    return null;
  }
  // Escape backticks and ${} so it's safe inside a JS template literal
  return raw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/**
 * Given a .md file path, resolve a .excalidraw href to an absolute path.
 * Checks relative to the md file first, then falls back to the diagrams/ folder.
 */
function resolveExcalidrawPath(href, mdFilePath) {
  // Try relative to the .md file
  const relPath = path.resolve(path.dirname(mdFilePath), href);
  if (fs.existsSync(relPath)) return relPath;

  // Try by filename only inside diagrams/
  const basename = path.basename(href);
  const inDiagrams = path.join(DIAGRAMS_DIR, basename);
  if (fs.existsSync(inDiagrams)) return inDiagrams;

  // Recursive search inside diagrams/ for the filename
  if (fs.existsSync(DIAGRAMS_DIR)) {
    const found = findFileByName(DIAGRAMS_DIR, basename);
    if (found) return found;
  }

  return null;
}

function findFileByName(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const res = findFileByName(full, name);
      if (res) return res;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

/**
 * Transform raw markdown:
 * - Replace .excalidraw links with an inline <ExcalidrawViewer> MDX component
 * - Add the MDX import at the top if any diagrams were injected
 * - Prepend Docusaurus front matter if the file doesn't already have it
 */
function transformMarkdown(content, mdFilePath) {
  const links = findExcalidrawLinks(content);
  let transformed = content;
  let injectedCount = 0;

  for (const link of links) {
    const absPath = resolveExcalidrawPath(link.href, mdFilePath);
    if (!absPath) {
      console.warn(`  ⚠  Could not resolve: ${link.href}`);
      continue;
    }

    const escapedJSON = readExcalidrawJSON(absPath);
    if (!escapedJSON) continue;

    const diagramName = path.basename(absPath, '.excalidraw');
    const replacement = `
<ExcalidrawViewer
  title="${link.label || diagramName}"
  data={\`${escapedJSON}\`}
/>
`;
    transformed = transformed.replace(link.full, replacement);
    injectedCount++;
  }

  // Inject MDX import at the very top (after front matter if present)
  if (injectedCount > 0) {
    const importLine = `import ExcalidrawViewer from '@site/src/components/ExcalidrawViewer';\n\n`;
    if (transformed.startsWith('---')) {
      // Insert after the closing --- of front matter
      const endOfFrontMatter = transformed.indexOf('\n---', 3) + 4;
      transformed =
        transformed.slice(0, endOfFrontMatter) +
        '\n' + importLine +
        transformed.slice(endOfFrontMatter);
    } else {
      transformed = importLine + transformed;
    }
  }

  return transformed;
}

/**
 * Derive a human-readable sidebar label from a folder name like
 * "01-fundamentals" → "Fundamentals"
 */
function folderToLabel(folderName) {
  return folderName
    .replace(/^\d+-/, '')          // strip leading "01-"
    .replace(/-/g, ' ')            // hyphens → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('📚 Generating docs from source notes...\n');

  // Clean and recreate docs/
  if (fs.existsSync(DOCS_OUT)) fs.rmSync(DOCS_OUT, { recursive: true });
  fs.mkdirSync(DOCS_OUT, { recursive: true });

  let totalFiles = 0;
  let totalDiagrams = 0;

  for (const folder of TOPIC_FOLDERS) {
    const srcDir = path.join(REPO_ROOT, folder);
    const mdFiles = findMarkdownFiles(srcDir);

    if (mdFiles.length === 0) {
      console.log(`  ⏭  Skipping ${folder} (no .md files found)`);
      continue;
    }

    const destDir = path.join(DOCS_OUT, folder);
    fs.mkdirSync(destDir, { recursive: true });

    // Write a _category_.json so Docusaurus shows a nice sidebar label
    fs.writeFileSync(
      path.join(destDir, '_category_.json'),
      JSON.stringify({ label: folderToLabel(folder), collapsed: true }, null, 2)
    );

    console.log(`📁 ${folder} (${mdFiles.length} file${mdFiles.length > 1 ? 's' : ''})`);

    for (const mdFile of mdFiles) {
      const raw = fs.readFileSync(mdFile, 'utf8');
      const diagramsInFile = findExcalidrawLinks(raw).length;

      const mdxContent = transformMarkdown(raw, mdFile);

      // Write as .mdx so Docusaurus processes the JSX components
      const relativePath = path.relative(srcDir, mdFile);
      const destFile = path.join(destDir, relativePath.replace(/\.md$/, '.mdx'));
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.writeFileSync(destFile, mdxContent);

      console.log(
        `  ✅ ${relativePath}${diagramsInFile > 0 ? ` (+${diagramsInFile} diagram${diagramsInFile > 1 ? 's' : ''})` : ''}`
      );

      totalFiles++;
      totalDiagrams += diagramsInFile;
    }
  }

  // Write a root index page
  const indexContent = `---
slug: /
title: System Design Notes
---

# System Design Notes

> Structured notes on distributed systems, architecture patterns, and interview preparation.

Browse topics from the sidebar, or jump to a section below.

## Topics

${TOPIC_FOLDERS.map((f) => `- [${folderToLabel(f)}](./${f}/)`).join('\n')}
`;
  fs.writeFileSync(path.join(DOCS_OUT, 'index.md'), indexContent);

  console.log(`\n✨ Done — ${totalFiles} pages, ${totalDiagrams} diagrams embedded.\n`);
}

main();
