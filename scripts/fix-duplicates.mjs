import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
const lines = readFileSync(file, 'utf8').split('\n');
const seen = new Set();
const toRemove = new Set();
const funcRe = /^\s*function\s+(\w+)\s*[({]/;
// First pass: find all function definitions
const defs = [];
lines.forEach((line, i) => {
  const m = line.match(funcRe);
  if (m) defs.push({ name: m[1], line: i });
});
// Find duplicates (keep first, mark later ones for removal)
const firstSeen = {};
defs.forEach(d => {
  if (firstSeen[d.name] !== undefined) {
    // This is a duplicate - find its end by counting braces
    let bc = 0, started = false, end = d.line;
    for (let i = d.line; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { bc++; started = true; }
        if (ch === '}') bc--;
      }
      if (started && bc === 0) { end = i; break; }
    }
    // Also remove preceding comments/blanks
    let start = d.line;
    for (let i = d.line - 1; i >= 0; i--) {
      const t = lines[i].trim();
      if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t === '') start = i;
      else break;
    }
    for (let i = start; i <= end; i++) toRemove.add(i);
  } else {
    firstSeen[d.name] = d.line;
  }
});
const fixed = lines.filter((_, i) => !toRemove.has(i)).join('\n');
writeFileSync(file, fixed);
console.log('Removed ' + toRemove.size + ' duplicate lines, ' + lines.length + ' -> ' + fixed.split('\n').length);
