<%*
/**
 * Clean meeting note:
 * - Parse date/time + attendees from pasted invite
 * - Rename file
 * - Overwrite note with YAML + body (removes original invite text)
 * - Body includes: chart DVJS + grouped-tasks DVJS + three Dataview tables
 */

// ---------- Helpers ----------
const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const fence = (lang, s) => "```" + lang + "\n" + s + "\n```";

// ---------- DataviewJS: Chart (colors as requested) ----------
const CHART_JS = String.raw`
(async () => {
  async function ensureChart() {
    if (window.Chart) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.2.1/chart.umd.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load Chart.js'));
      document.body.appendChild(s);
    });
  }

  const days = Number(dv.current().file.frontmatter?.days_since_last_meeting) || 14;

  const tracked = {};
  const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

  const lookupFilePath = '5_system/tags.md';
  const lookupSection = '## Work Codes';
  const lookupContent = await dv.io.load(lookupFilePath);
  if (!lookupContent) { dv.paragraph('Could not load work tags from ' + lookupFilePath); return; }

  const lookupLines = lookupContent.split('\n');
  let inLookupSection = false;
  const projectLookup = new Map();

  for (const line of lookupLines) {
    if (line.trim() === lookupSection) { inLookupSection = true; continue; }
    if (inLookupSection && line.startsWith('##') && line.trim() !== lookupSection) break;
    if (inLookupSection && line.startsWith('|') && !line.includes('---')) {
      const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
      if (match) {
        const projectName = match[1].trim();
        const abbreviation = match[2].trim();
        projectLookup.set(abbreviation, projectName);
      }
    }
  }

  const weekEndDate = dv.current().file.frontmatter.date;
  const weekStartDate = moment(weekEndDate).add(-days, 'days');

  dv.pages('"0_periodic"').file.lists
    .where(x => x.section.subpath === 'Work log' &&
      x.text.includes('#abmi') &&
      !x.text.includes('#abmi/SOCIAL') &&
      !x.text.includes('#abmi/BREAK') &&
      !x.text.includes('#abmi/sick_day') &&
      !x.text.includes('#abmi/vacation_day')).array()
    .forEach(x => {
      const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
      if (!times) return;

      const start = moment(times[1], 'HH:mm');
      const end = moment(times[2], 'HH:mm');
      const minutes = moment.duration(end.diff(start)).asMinutes();
      const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD') : null;
      if (!date || !date.isBetween(weekStartDate, moment(weekEndDate), null, '[]')) return;

      const tags = x.text.match(tagsRegex)?.map(tag => tag.trim());
      const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, '');

      const key = weekStartDate.format('MM/DD') + ' to ' + moment(weekEndDate).format('MM/DD');
      if (!tracked[key]) tracked[key] = { entries: [], minutes: 0, tags: {} };
      tracked[key].entries.push({
        path: x.path,
        start: start.format('HH:mm'),
        end: end.format('HH:mm'),
        minutes,
        tags: tags || [],
        description: description || ''
      });
      tracked[key].minutes += minutes;

      tags?.forEach(tag => {
        if (tag.startsWith('#abmi/')) {
          const tagName = tag.replace('#abmi/', '');
          if (!tracked[key].tags[tagName]) tracked[key].tags[tagName] = 0;
          tracked[key].tags[tagName] += minutes;
        }
      });
    });

  const abmiTags = new Set();
  Object.keys(tracked).forEach(week => {
    Object.keys(tracked[week].tags).forEach(tag => abmiTags.add(tag));
  });

  const sortedAbmiTags = Array.from(abmiTags).sort();
  let totalWeekTime = 0;
  const totalAbmiTimes = {};
  sortedAbmiTags.forEach(tag => { totalAbmiTimes[tag] = 0; });

  Object.keys(tracked).forEach(week => {
    const weekEntry = tracked[week];
    totalWeekTime += weekEntry.minutes;
    sortedAbmiTags.forEach(tag => { totalAbmiTimes[tag] += weekEntry.tags[tag] || 0; });
  });

  const percentages = [];
  const projectLabels = [];
  sortedAbmiTags.forEach(tag => {
    const pct = totalWeekTime ? ((totalAbmiTimes[tag] / totalWeekTime) * 100) : 0;
    percentages.push(Number(pct.toFixed(0)));
    projectLabels.push(projectLookup.get(tag) || tag);
  });

  const ctx = dv.el('canvas', null);

  await ensureChart();
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: projectLabels,
      datasets: [{
        label: 'Percentage Worked',
        data: percentages,
        backgroundColor: 'rgba(120, 144, 156, 0.6)',
        borderColor: 'rgba(120, 144, 156, 1)',
        borderWidth: 1,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: { beginAtZero: true, max: 100, grid: { display: false }, ticks: { callback: (v) => v + '%' } },
        y: { grid: { display: false } }
      }
    }
  });
})();
`;

// ---------- DataviewJS: Grouped tasks by project (your missing block) ----------
const GROUPED_JS = String.raw`
(async () => {
  const days = Number(dv.current().file.frontmatter?.days_since_last_meeting) || 14;

  const tracked = {};
  const tagsRegex = /#[^\s#)]+/g;
  const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}\s*/;

  const mdLinkRegex = /\[[^\]]*?\]\([^)]+?\)/g;
  const angleLinkRegex = /<https?:\/\/[^>]+>/g;
  const bareUrlRegex = /\bhttps?:\/\/\S+/g;

  const weekEndStr = dv.current().file.frontmatter?.date;
  if (!weekEndStr) { dv.paragraph("Warning: No 'date' in frontmatter (YYYY-MM-DD)."); return; }
  const weekEnd = moment(weekEndStr, "YYYY-MM-DD").endOf("day");
  const weekStart = moment(weekEndStr, "YYYY-MM-DD").add(-days, "days").startOf("day");

  const REF_PAGE_CANDIDATES = ["tags","Tags"];
  const REF_SECTION = "Work Codes";
  let refPage = null;
  for (const name of REF_PAGE_CANDIDATES) { refPage = dv.page(name); if (refPage) break; }
  if (!refPage) { dv.paragraph("Warning: Could not find page [[tags]] or [[Tags]]."); return; }

  const md = await dv.io.load(refPage.file.path);
  const lines = md.split(/\r?\n/);

  let idx = lines.findIndex(l => {
    const m = l.match(/^#{1,6}\s*(.+?)\s*$/);
    return m && m[1].trim().toLowerCase() === REF_SECTION.toLowerCase();
  });
  if (idx === -1) { dv.paragraph('Warning: Heading "' + REF_SECTION + '" not found in [[' + refPage.file.name + ']].'); return; }
  idx++;
  while (idx < lines.length && /^\s*$/.test(lines[idx])) idx++;

  const table = [];
  while (idx < lines.length && /^\s*\|.*\|\s*$/.test(lines[idx])) {
    table.push(lines[idx].trim());
    idx++;
  }
  if (table.length < 2) { dv.paragraph('Warning: No markdown table under "' + REF_SECTION + '".'); return; }

  const headerCells = table[0].split("|").slice(1, -1).map(s => s.trim().toLowerCase());
  const tagCol = headerCells.findIndex(h => h === "tag");
  const nameCol = headerCells.findIndex(h => h === "name");
  if (tagCol === -1 || nameCol === -1) { dv.paragraph("Warning: Table must have 'Tag' and 'Name' columns."); return; }

  const tagToName = {};
  const codeToName = {};
  for (const row of table.slice(2)) {
    const cells = row.split("|").slice(1, -1).map(s => s.trim());
    if (cells.length <= Math.max(tagCol, nameCol)) continue;
    const code = (cells[tagCol] || "").toUpperCase();
    const name = (cells[nameCol] || "").trim();
    if (!code || !name) continue;
    tagToName['#ABMI/' + code] = name;
    codeToName[code] = name;
  }

  const EXCLUDE = new Set(["#abmi/BREAK", "#abmi/EMAIL", "#abmi/MEETNG", "#abmi/ADMIN"].map(s => s.toUpperCase()));

  dv.pages('"0_periodic"').file.lists
    .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi"))
    .array()
    .forEach(x => {
      const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
      if (!times) return;

      const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return;
      const date = moment(dateMatch[1], "YYYY-MM-DD");
      if (!date.isBetween(weekStart, weekEnd, null, "[]")) return;

      const rawText = x.text;

      const textNoLinks = rawText
        .replace(mdLinkRegex, "")
        .replace(angleLinkRegex, "")
        .replace(bareUrlRegex, "");

      const tags = textNoLinks.match(tagsRegex)
        ?.map(t => t.trim())
        ?.filter(t => t.toLowerCase().startsWith("#abmi/"))
        ?.filter(t => !EXCLUDE.has(t.toUpperCase()));
      if (!tags || tags.length === 0) return;

      let description = rawText.replace(/#abmi\/[^\s#)]+/gi, "").trim();
      description = description.replace(timeRegex, "").trim();

      tags.forEach(tag => {
        const tUpper = tag.toUpperCase();
        const codeOnly = tUpper.replace(/^#ABMI\//, "");
        const display = tagToName[tUpper] ?? codeToName[codeOnly] ?? tag;
        if (!tracked[display]) tracked[display] = [];
        const dupe = tracked[display].some(t => t.description === description && t.date === date.format("YYYY-MM-DD"));
        if (!dupe) tracked[display].push({ description, date: date.format("YYYY-MM-DD"), path: x.path });
      });
    });

  Object.keys(tracked).sort().forEach(category => {
    const tasks = tracked[category].sort((a, b) => moment(a.date).diff(moment(b.date)));
    if (tasks.length === 0) return;
    dv.header(3, category);
    dv.paragraph(tasks.map(t => '- ' + t.description + '\n').join(''));
  });
})();
`;

// ---------- Dataview tables (as raw blocks) ----------
const DV_MEETINGS = fence("dataview", String.raw`
TABLE without ID file.link as "Date/Time", description As Description
From -"3_Resources/Obsidian/Templates"
WHERE date <= striptime(this.date)
WHERE date >= striptime(this.date) - dur(default(this.days_since_last_meeting, 14) + " days")
WHERE contains(type,"meeting")
SORT file.name ASC
`);

const DV_PRESENTATIONS = fence("dataview", String.raw`
TABLE without ID link(file.path, title) as "Title", dateformat(date, "yyyy-MM-dd") as Date, description as Description
FROM -"3_Resources/Obsidian/Templates"
WHERE date <= striptime(this.date)
WHERE date >= striptime(this.date) - dur(default(this.days_since_last_meeting, 14) + " days")
WHERE contains(type, "presentation")
SORT date ASC
`);

const DV_PAPERS = fence("dataview", String.raw`
TABLE without ID link(file.path, title) as "Title", author as "First Author", year as "Year", description as "Description"
From -"3_Resources/Obsidian/Templates"
WHERE file.cday <= striptime(this.date)
WHERE file.cday >= striptime(this.date) - dur(default(this.days_since_last_meeting, 14) + " days")
WHERE contains(type,"literature")
SORT title ASC
`);

// ---------- Parse the pasted invite text ----------
const content = tp.file.content || "";

// Extract meeting date/time
const dateMatch = content.match(/(\w+\s\d{1,2},\s\d{4})\sat\s(\d{1,2}:\d{2}\s?[AP]M)\sto\s(\d{1,2}:\d{2}\s?[AP]M)/i);

// Defaults
let meetingDate = tp.date.now("YYYY-MM-DD");
let meetingTime = tp.date.now("HH-mm");
let dailyTag    = `#daily/${tp.date.now("YYYY/MM")}`;
let daysSince   = 14;

// Parse + rename if possible
if (dateMatch) {
  const parsedDate  = moment(dateMatch[1], "MMM D, YYYY");
  const parsedStart = moment(dateMatch[2], "h:mm A");
  const parsedEnd   = moment(dateMatch[3], "h:mm A");
  if (parsedDate.isValid() && parsedStart.isValid() && parsedEnd.isValid()) {
    meetingDate = parsedDate.format("YYYY-MM-DD");
    meetingTime = parsedStart.format("HH-mm");
    dailyTag    = `#daily/${parsedDate.format("YYYY/MM")}`;
    await tp.file.rename(`${meetingDate}_${meetingTime}`);
  }
}

// Description = first non-empty line (strip **)
const firstLine = (content.split("\n").find(l => l.trim() !== "") || "");
const description = firstLine.replace(/\*\*/g, "");

// --- Attendees ---
const attendeesYaml = [
  `  - Brandon Allen`,
  `  - Brendan Casey`
].join("\n");


// ---------- Build final doc (frontmatter + body) ----------
const yaml = [
  "---",
  `date: ${meetingDate}`,
  "type: meeting",
  `days_since_last_meeting: ${daysSince}`,
  "tags:",
  `  - \"${dailyTag}\"`,
  "attendees:",
  attendeesYaml,
  `description: \"${esc(description)}\"`,
  "---",
  ""
].join("\n");

const body =
  "## Agenda/Questions\n- \n\n---\n## Work Summary\n\n" +
  fence("dataviewjs", CHART_JS) + "\n\n" +
  fence("dataviewjs", GROUPED_JS) + "\n\n" +
  "### Meetings\n\n" + DV_MEETINGS + "\n\n" +
  "### Presentations\n\n" + DV_PRESENTATIONS + "\n\n" +
  "### Papers read\n\n" + DV_PAPERS + "\n\n" +
  "---\n\n## Notes";

let finalDoc = yaml + body;

// Normalize and ensure start
finalDoc = finalDoc.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").replace(/^[\s\u200B]+/, "");
if (!finalDoc.startsWith("---")) finalDoc = "---\n" + finalDoc.replace(/^[\-\s]*/, "");

// Write
const file = app.workspace.getActiveFile();
await app.vault.modify(file, finalDoc);

// Silence Templater output
tR = "";
%>