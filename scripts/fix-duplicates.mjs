import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// Fix 1: Ensure React is imported (needed for React.createElement, React.Fragment etc.)
const importLine = 'import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";';
const fixedImport = 'import React, { useState, useRef, useEffect, useCallback, createContext, useContext, useMemo, useReducer } from "react";';
content = content.replace(importLine, fixedImport);

// Fix 2: Remove duplicate function definitions
const lines = content.split('\n');
const funcRe = /^\s*function\s+(\w+)\s*[({]/;
const defs = [];
lines.forEach((line, i) => {
  const m = line.match(funcRe);
  if (m) defs.push({ name: m[1], line: i });
});
const firstSeen = {};
const toRemove = new Set();
defs.forEach(d => {
  if (firstSeen[d.name] !== undefined) {
    let bc = 0, started = false, end = d.line;
    for (let i = d.line; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { bc++; started = true; }
        if (ch === '}') bc--;
      }
      if (started && bc === 0) { end = i; break; }
    }
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
console.log('Fixed React import and removed ' + toRemove.size + ' duplicate lines (' + lines.length + ' -> ' + fixed.split('\n').length + ')');
