---
title: <% tp.file.title
  .replace(/^\d{4}-\d{2}-\d{2}_/, '')
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/\b\w/g, c => c.toUpperCase())
%>
date: <% (tp.file.title.match(/^\d{4}-\d{2}-\d{2}/) ?? [tp.date.now("YYYY-MM-DD")])[0] %>
type: presentation
tags: 
  - 
attendees: 
  - 
  - 
description: ""
length: ""
wordcountgoal: "130 wpm"
cssclasses:
  - heading-numbers
file_link: "[📄](file:///)"
---

## Table of Contents

```dataviewjs
// Load current note
const path = dv.current().file.path;
const text = await dv.io.load(path);

// Get the current note's basename (file name without extension)
const noteName = dv.current().file.name;

// Split into lines
let lines = text.split(/\r?\n/);

// Regex for headings (#, ##, ###, etc.)
const headingRegex = /^(#+)\s+(.*)/;

// --- Strip out all fenced code blocks entirely ---
// This removes lines between ``` and ```
let noCode = [];
let inCode = false;
for (const line of lines) {
  if (line.trim().startsWith("```")) {
    inCode = !inCode;
    continue; // skip the fence line too
  }
  if (!inCode) noCode.push(line);
}
lines = noCode;

// Helper: strip HTML tags
const clean = s => s.replace(/<[^>]+>/g, "");

// --- Find where this DataviewJS block starts ---
const thisBlockIdx = lines.findIndex(l => l.trim() === "```dataviewjs");
const startIdx = thisBlockIdx === -1 ? 0 : thisBlockIdx;

// Work only on the part of the note below the block
const relevant = lines.slice(startIdx + 1);

// 1) Find first heading index within the relevant slice
const firstHeadingIdx = relevant.findIndex(l => headingRegex.test(l));

let belowFirstHeadingCount = 0;
if (firstHeadingIdx !== -1) {
  const after = relevant.slice(firstHeadingIdx + 1);
  const bodyOnly = after.filter(l => !headingRegex.test(l)).join("\n");
  const cleaned = clean(bodyOnly);
  const wordsAll = cleaned.match(/\b[\p{L}\p{N}'-]+\b/gu) ?? [];
  belowFirstHeadingCount = wordsAll.length;
}

// 2) Build sections within the relevant slice
let sections = [];
let current = null;

for (let i = 0; i < relevant.length; i++) {
  const line = relevant[i];
  const m = line.match(headingRegex);
  if (m) {
    if (current) sections.push(current);
    current = { level: m[1].length, title: m[2], body: [] };
  } else if (current) {
    current.body.push(line);
  }
}
if (current) sections.push(current);

// 3) Compute counts per section
const rows = [];

if (firstHeadingIdx !== -1) {
  rows.push(["**Total**", `**${belowFirstHeadingCount}**`]);
  rows.push(["---", "---"]); // divider row
}

for (const s of sections) {
  const body = clean(s.body.join("\n"));
  const words = body.match(/\b[\p{L}\p{N}'-]+\b/gu) ?? [];
  const link = `[[${noteName}#${s.title}|${s.title}]]`;
  rows.push([link, words.length]);
}

// 4) Output as table
dv.table(["Heading / Summary", "Word Count"], rows);

```

---
## 1. Title


---
##  2.


---
##  3.


---
##  4.


---
##  5.


---
