---
date: <% tp.date.weekday("YYYY-MM-DD", 0) %>
type: weekly
tags: 
<%*
const start = moment(tp.date.weekday("YYYY-MM-DD", 0));
const end   = moment(tp.date.weekday("YYYY-MM-DD", 6));

const months = [
  `daily/${start.format("YYYY")}/${start.format("MM")}`,
  `daily/${end.format("YYYY")}/${end.format("MM")}`
];

// de-duplicate if same month
const uniq = [...new Set(months)];

tR += uniq.map(tag => `  - ${tag}`).join("\n");
%>
description: Weekly note from <% tp.date.weekday("YYYY-MM-DD", 0)%> to <% tp.date.weekday("YYYY-MM-DD", 6)%>
target_hours: 40
banked_time: 
---

```dataviewjs
const weekStart = moment(dv.current().file.frontmatter.date);
const weekEnd = moment(weekStart).add(6, 'days');
const pages = dv.pages('"0_periodic"')
  .where(p => p.file.name.match(/^\d{4}-\d{2}-\d{2}/))
  .where(p => {
    const date = moment(p.file.name.slice(0, 10), 'YYYY-MM-DD');
    return date.isBetween(weekStart, weekEnd, null, '[]');
  });

let allWarnings = [];

function calculateMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

pages.forEach(page => {
  const lists = page.file.lists.where(x => x.section?.subpath === "Work log").array();
  lists.forEach(x => {
    const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}/;

    if (!x.text.includes("#abmi")) {
      allWarnings.push(`Missing #abmi tag in [[${page.file.name}]]: <div>${x.text}</div> <br> </span>`);
    }

    if (!timePattern.test(x.text)) {
      allWarnings.push(`Improper time format in [[${page.file.name}]]: <div>${x.text}</div> <br> </span>`);
    }

    const exempt = /#abmi\/(EMAIL|BREAK)\b/.test(x.text);
    const descMatch = x.text.match(/^\d{2}:\d{2}-\d{2}:\d{2}\s+(.*?)\s*(#|$)/);

    if (!exempt && (!descMatch || !descMatch[1].trim())) {
      allWarnings.push(`Missing description in [[${page.file.name}]]: <div>${x.text}</div> <br> </span>`);
    }
  });
});

if (allWarnings.length > 0) {
  const formatted = allWarnings.map(w => `- ${w}`).join('\n> ');
  dv.paragraph(`> [!WARNING]- Issues found in daily logs\n> ${formatted}`);
}




```
[[<% tp.date.weekday("YYYY-MM-DD", -7) %>_to_<% tp.date.weekday("YYYY-MM-DD", -1) %>|last week]]
[[<% tp.date.weekday("YYYY-MM-DD", 7) %>_to_<% tp.date.weekday("YYYY-MM-DD", 13) %>|next week]]
[[0_periodic/monthly/<% tp.date.now("YYYY-MM") %>|this month]]

---
## Project Schedule
### Planned Hours

```dataviewjs
// ==== Your planned hours table here ====
//const rows = [
//  { label: "Sunday, September 7, 2025", hours: 0.0 },
//  { label: "Monday, September 8, 2025", hours: 0.0 },
//  { label: "Tuesday, September 9, 2025", hours: 0.0 },
//  { label: "Wednesday, September 10, 2025", hours: 0.0 },
//  { label: "Thursday, September 11, 2025", hours: 0.0 },
//  { label: "Friday, September 12, 2025", hours: 0.0 },
//  { label: "Saturday, September 13, 2025", hours: 0.0 },
//];

// ==== SETTINGS ====
const weekStartDate = dv.current().file.frontmatter.date;  // "2025-09-07"
const targetHours = dv.current().file.frontmatter.target_hours ?? 40;

// ==== Collect actuals from Work log ====
const timeRx = /^(\d{2}:\d{2})-(\d{2}:\d{2})/;
const actualMinutesByDate = {};
dv.pages('"0_periodic"').file.lists
  .where(li => li.section?.subpath === "Work log" && li.text.includes("#abmi") && !li.text.includes("#abmi/sick_day") && !li.text.includes("#abmi/vacation_day"))
  .array()
  .forEach(li => {
    const mTimes = li.text.match(timeRx);
    if (!mTimes) return;
    const start = window.moment(mTimes[1], "HH:mm");
    const end   = window.moment(mTimes[2], "HH:mm");
    const minutes = window.moment.duration(end.diff(start)).asMinutes();
    const pathDate = (li.path.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
    if (!pathDate) return;
    actualMinutesByDate[pathDate] = (actualMinutesByDate[pathDate] ?? 0) + minutes;
  });

// ==== Build table ====
let cum = 0;
const today = window.moment().startOf("day");

const table = rows.map(r => {
  // Try to parse date out of label
  const d = window.moment(r.label, ["dddd, MMMM D, YYYY"]);
  const key = d.isValid() ? d.format("YYYY-MM-DD") : null;

  let hours;
  if (key && actualMinutesByDate[key] != null) {
    // Use actual for past/today if logged
    hours = (actualMinutesByDate[key] / 60).toFixed(2);
  } else {
    // Use planned for future or if no actuals
    hours = r.hours;
  }

  cum += Number(hours) || 0;
  return [r.label, hours, cum.toFixed(2)];
});

dv.table(["Date", "Hours", "Cumulative Total"], table);


```

### Project Schedule

```dataviewjs
(async () => {
  // === Config ===
  const DATE_FIELDS = ["scheduled","start","due"]; // include any that fall in the week
  const REF_PAGE_CANDIDATES = ["tags","Tags"];    // try both just in case
  const REF_SECTION = "Work Codes";               // heading text (case-insensitive)
  const PAGE_FILTER = dv.pages();                 // scope if needed, e.g. dv.pages('"1_projects/active"')

  // Ignore these ABMI codes everywhere (case-insensitive)
  const IGNORE_CODES = new Set(["ADMIN", "GENWRK"]);

  // === Manual tags per day (OPTIONAL) ===================================
  // Put ABMI codes here. Example: Sun: ["PIWO","INVSPC"]
  const TAGS_PER_DAY = {
    Sun: [],
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: []
  };
  // ======================================================================

  // 1) Resolve the week from YAML
  const weekStartStr = dv.current().file.frontmatter?.date;
  if (!weekStartStr) { dv.paragraph("⚠️ No 'date' in frontmatter (YYYY-MM-DD)."); return; }
  const weekStart = moment(weekStartStr, "YYYY-MM-DD").startOf("day");
  const weekEnd   = weekStart.clone().add(6, "days").endOf("day");

  // 2) Load and parse the Work Codes table -> { CODE: "Name" }
  let refPage = null;
  for (const name of REF_PAGE_CANDIDATES) {
    refPage = dv.page(name);
    if (refPage) break;
  }
  if (!refPage) { dv.paragraph(`⚠️ Could not find page [[tags]] (or [[Tags]]).`); return; }

  const md = await dv.io.load(refPage.file.path);
  const lines = md.split(/\r?\n/);

  // Find heading line (case-insensitive, any level ###)
  let i = lines.findIndex(l => /^#{1,6}\s*(.+?)\s*$/.test(l) && RegExp.$1.toLowerCase() === REF_SECTION.toLowerCase());
  if (i === -1) { dv.paragraph(`⚠️ Could not find heading "${REF_SECTION}" in [[${refPage.file.name}]].`); return; }
  i++; // move below heading

  // Skip blank lines until table header starts
  while (i < lines.length && /^\s*$/.test(lines[i])) i++;

  // Collect contiguous table lines (start with '|' and have at least 2 pipes)
  const tableLines = [];
  while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
    tableLines.push(lines[i].trim());
    i++;
  }
  if (tableLines.length < 2) { dv.paragraph(`⚠️ No markdown table found under "${REF_SECTION}".`); return; }

  // Remove header + separator (keep rows after the --- line)
  const rows = tableLines.slice(2);

  const codeToName = {};
  for (const row of rows) {
    // Split safely: drop the outer pipes and trim
    const cells = row.split("|").slice(1, -1).map(s => s.trim());
    if (cells.length < 2) continue;
    const tag = (cells[0] || "").toUpperCase(); // e.g., BDT
    const name = (cells[1] || "").trim();       // e.g., Biodiversity Trajectories
    if (tag && name) codeToName[tag] = name;
  }

  // Helpers
  const inWeek = (d) => d && d >= weekStart.toDate() && d <= weekEnd.toDate();

  // Only completion date + DATE_FIELDS
  function datesForTask(t) {
    const dates = [];

    // 1) Completion date (if done)
    if (t.completed && t.completion) {
      const d = t.completion.toJSDate();
      if (inWeek(d)) dates.push(d);
    }

    // 2) scheduled/start/due (current values)
    for (const f of DATE_FIELDS) {
      if (t[f]) {
        const d = t[f].toJSDate();
        if (inWeek(d)) dates.push(d);
      }
    }

    // Dedupe by calendar day
    const seen = new Set();
    return dates.filter(d => {
      const key = d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Extract ABMI codes from a task, filter ignored ones
  const getAbmiCodes = (t) => {
    const parsed = (t.tags ?? []);
    const fromText = (t.text.match(/#abmi\/[^\s#)\]]+/gi) || []).map(s => s.slice(1)); // drop '#'
    const tags = [...new Set([...parsed, ...fromText])].filter(x => x.toLowerCase().startsWith("abmi/"));
    return tags
      .map(tag => tag.replace(/^abmi\//i, "")) // -> "PIWO"
      .map(code => code.toUpperCase())
      .filter(code => !IGNORE_CODES.has(code));
  };

  // 3) Gather tasks with ANY relevant date(s) in this week
  const tasks = PAGE_FILTER.flatMap(p => p.file.tasks)
    .map(t => ({ t, dates: datesForTask(t) }))
    .filter(({ dates }) => dates.length);

  // 4) Build per-day unique set of Names (mapped from codes); fall back to code if no mapping
  const daySets = Array.from({ length: 7 }, () => new Set());
  for (const { t, dates } of tasks) {
    const codes = getAbmiCodes(t); // already filtered for ignored codes
    dates.forEach(d => {
      const dow = d.getDay(); // 0..6 (Sun..Sat)
      codes.forEach(code => {
        const name = codeToName[code] ?? code; // fallback to raw code if unknown
        daySets[dow].add(name);
      });
    });
  }

  // 4.5) Merge manual tags from TAGS_PER_DAY (case-insensitive, map via Work Codes, ignore ADMIN/GENWRK)
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  dayNames.forEach((dName, idx) => {
    const extra = TAGS_PER_DAY?.[dName] ?? [];
    const list = Array.isArray(extra) ? extra : String(extra ?? "").split(/[,\s]+/);
    list
      .map(s => s.trim())
      .filter(Boolean)
      .map(code => code.toUpperCase())
      .filter(code => !IGNORE_CODES.has(code))
      .forEach(code => {
        const name = codeToName[code] ?? code;
        daySets[idx].add(name);
      });
  });

  // 5) Build flat list of { day, project } rows (skip weekend if both empty)
  const days = dayNames;
  let rowsOut = [];

  const satEmpty = daySets[6].size === 0;
  const sunEmpty = daySets[0].size === 0;

  daySets.forEach((set, dayIndex) => {
    if (satEmpty && sunEmpty && (dayIndex === 0 || dayIndex === 6)) return; // skip Sun/Sat if both empty
    const projects = set.size ? [...set].sort() : ["—"];
    projects.forEach(proj => rowsOut.push({ Day: days[dayIndex], Project: proj }));
  });

  // Sort by day order, then project name
  rowsOut.sort((a, b) => {
    const dayOrder = days.indexOf(a.Day) - days.indexOf(b.Day);
    if (dayOrder !== 0) return dayOrder;
    return a.Project.localeCompare(b.Project);
  });

  // Blank duplicate day labels to visually group
  let lastDay = null;
  rowsOut = rowsOut.map(row => {
    if (row.Day === lastDay) return { Day: "", Project: row.Project };
    lastDay = row.Day; return row;
  });

  // Render pivoted table
  dv.table(["Day", "Project"], rowsOut.map(r => [r.Day, r.Project]));

  // Optional: warn if nothing matched from the mapping
  const mappedAny = daySets.some(s => [...s].some(name => Object.values(codeToName).includes(name)));
  if (!mappedAny) {
    dv.paragraph("ℹ️ No matches found in Work Codes table. Check page/heading name, table location, or code casing.");
  }
})();

```

---
## Time Budget

```dataviewjs
(async () => {
    const tracked = {};
    const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

    const weekStartDate = dv.current().file.frontmatter.date;
    const targetHours = dv.current().file.frontmatter.target_hours ?? 40;
    const weekEndDate = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');

    dv.pages('"0_periodic"').file.lists
        .where(x => x.section.subpath === "Work log" &&
            x.text.includes("#abmi") &&
            !x.text.includes("#abmi/sick_day") &&
            !x.text.includes("#abmi/vacation_day")).array()
        .forEach(x => {
            const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (times) {
                const start = moment(times[1], 'HH:mm');
                const end = moment(times[2], 'HH:mm');
                const minutes = moment.duration(end.diff(start)).asMinutes();
                const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
                const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD') : null;
                if (!date) return;

                const weekStart = date.clone().startOf('week').format('YYYY-MM-DD');
                const weekEnd = date.clone().endOf('week').format('YYYY-MM-DD');
                const week = `[[${weekStart}_to_${weekEnd}]]`;

                if (date.isBetween(weekStartDate, weekEndDate, null, '[]')) {
                    const tags = x.text.match(tagsRegex)?.map(tag => tag.trim());
                    const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, '');

                    if (!tracked[week]) tracked[week] = {};
                    if (tracked[week][date]) {
                        tracked[week][date].entries.push({
                            path: x.path,
                            start: start.format('HH:mm'),
                            end: end.format('HH:mm'),
                            minutes: minutes,
                            tags: tags || [],
                            description: description || ''
                        });
                        tracked[week][date].minutes += minutes;
                    } else {
                        tracked[week][date] = {
                            path: x.path,
                            entries: [{
                                path: x.path,
                                start: start.format('HH:mm'),
                                end: end.format('HH:mm'),
                                minutes: minutes,
                                tags: tags || [],
                                description: description || ''
                            }],
                            minutes: minutes
                        };
                    }
                }
            }
        });

    const hours = minutes => (minutes / 60).toFixed(1);

    const abmiTags = new Set();
    Object.keys(tracked).forEach(week => {
        Object.keys(tracked[week]).forEach(date => {
            tracked[week][date].entries.forEach(entry => {
                entry.tags.forEach(tag => {
                    if (tag.startsWith('#abmi/') && tag !== '#abmi/BREAK') {
                        abmiTags.add(tag.replace('#abmi/', ''));
                    }
                });
            });
        });
    });
    const sortedAbmiTags = Array.from(abmiTags).sort();

    const table = [];
    let totalWeekTime = 0;
    const totalAbmiTimes = {};
    sortedAbmiTags.forEach(tag => {
        totalAbmiTimes[tag] = 0;
    });

    Object.keys(tracked).forEach(week => {
        Object.keys(tracked[week])
            .sort((a, b) => moment(a).diff(moment(b)))
            .forEach(date => {
                const dailyEntry = tracked[week][date];
                const dailyTotal = dailyEntry.minutes;
                totalWeekTime += dailyTotal;

                sortedAbmiTags.forEach(tag => {
                    totalAbmiTimes[tag] += getTaggedMinutes(dailyEntry.entries, `#abmi/${tag}`);
                });

                const link = `[[${dailyEntry.path}#Work log|${moment(date).format('dddd D MMMM')}]]`;
                const row = [link, hours(dailyTotal)];
                sortedAbmiTags.forEach(tag => {
                    row.push(hours(getTaggedMinutes(dailyEntry.entries, `#abmi/${tag}`)));
                });
                table.push(row);
            });
    });

    const header = ['Day/Week', 'Total'];
    sortedAbmiTags.forEach(tag => {
        header.push(tag.substring(0, 6));
    });

    const percentageRow = ['**Percent**', ''];
    const percentages = [];
    sortedAbmiTags.forEach(tag => {
        const percentage = ((totalAbmiTimes[tag] / totalWeekTime) * 100).toFixed(0);
        percentages.push(percentage);
        percentageRow.push(`${percentage}%`);
    });
    table.unshift(percentageRow);

    const totalRow = ['**Total**', `**${hours(totalWeekTime)}**`];
    sortedAbmiTags.forEach(tag => {
        totalRow.push(`**${hours(totalAbmiTimes[tag])}**`);
    });
    table.splice(1, 0, totalRow);

    dv.table(header, table);

    // Print Banked Time
    // const bankedTime = (0, targetHours - totalWeekTime / 60).toFixed(1);
    const bankedTime = (totalWeekTime / 60 - targetHours).toFixed(1);
    dv.paragraph(`**Banked Time:** ${bankedTime}`);

    dv.paragraph('<div style="height: 30px;"></div>');

    const ctx = dv.el("canvas", null);
    await import("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.2.1/chart.umd.js");

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedAbmiTags,
            datasets: [{
                label: 'Percentage Worked',
                data: percentages,
                backgroundColor: 'rgba(120, 144, 156, 0.6)',
                borderColor: 'rgba(120, 144, 156, 1)',
                borderWidth: 1,
                barThickness: 25
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function (value) {
                            return value + "%";
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });

    function getTaggedMinutes(entries, tag) {
        return entries.reduce((total, entry) => {
            if (entry.tags.includes(tag)) {
                total += entry.minutes;
            }
            return total;
        }, 0);
    }
})();

```
---
## Work Summary

```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:\s\S+)*/g;

// Define the start and end dates for the desired week
const weekStartDate = dv.current().file.frontmatter.date;
const weekEndDate = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');

// Gather data
dv.pages('"0_periodic"').file.lists
  .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi") && 
!x.text.includes("#abmi/sick_day") && 
!x.text.includes("#abmi/vacation_day")).array() // Add condition to exclude entries with tags "#sick_day"  or "vacation_day"
  .forEach(x => {
    // Find the start/end times for each bullet point
    const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/)
    if (times) {
      const start = moment(times[1], 'HH:mm');
      const end = moment(times[2], 'HH:mm');
      const minutes = moment.duration(end.diff(start)).asMinutes();
      const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];
      
      // Check if the date falls within the specified week start and end dates
      if (moment(date).isBetween(weekStartDate, weekEndDate, null, '[]')) {
        const week = `[[${weekStartDate}_to_${weekEndDate}]]`;
        // Extract tags from the note
        const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()); // Extracts all hashtags from the note
        const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, ''); // Extracting text after time values

        if (!tracked[week]) tracked[week] = {};
        if (tracked[week][date]) {
          tracked[week][date].entries.push({
            path: x.path,
            start: start.format('HH:mm'),
            end: end.format('HH:mm'),
            minutes: minutes,
            tags: tags || [],
            description: description || '' // Initialize description as an empty string
          });
          tracked[week][date].minutes += minutes;
          // Append tags to the existing tracked entry
          tracked[week][date].tags = [...new Set(tracked[week][date].tags.concat(tags || []))];
        } else {
          tracked[week][date] = {
            path: x.path,
            entries: [{
              path: x.path,
              start: start.format('HH:mm'),
              end: end.format('HH:mm'),
              minutes: minutes,
              tags: tags || [],
              description: description || '' // Initialize description as an empty string
            }],
            minutes: minutes,
            tags: tags || [],
            description: description || '' // Initialize description as an empty string
          };
        }
      }
    }
  });

const hours = minutes => (minutes / 60).toFixed(1);

const table = [];
let totalWeekMinutes = 0;

// Calculate total hours before iterating through daily entries
Object.keys(tracked).sort((a, b) => b.localeCompare(a))
  .forEach(weekDate => {
    const weekEntries = tracked[weekDate];

    Object.keys(weekEntries).forEach(date => {
      totalWeekMinutes += weekEntries[date].minutes;
    });
  });

// Push total hours row to the top of the table
table.push(['**Total Hours**', '**' + hours(totalWeekMinutes) + '**', '']);

// Iterate through tracked entries to fill the table
Object.keys(tracked).sort((a, b) => b.localeCompare(a))
  .forEach(weekDate => {
    const weekEntries = tracked[weekDate];

    // Sort daily values within the week summary in descending order by date
    const sortedDates = Object.keys(weekEntries).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
      const dailyEntry = weekEntries[date];
      const link = `[[${dailyEntry.path}#Work log|${moment(date).format('dddd D MMMM')}]]`;

      // Push daily summary above the entries for each day
      table.push(['**' + link + '**', '**' + hours(dailyEntry.minutes) + '**', '']);

      // Push individual time entries (sorted in descending order) with empty time cells
      dailyEntry.entries.sort((a, b) => moment(b.start, 'HH:mm').diff(moment(a.start, 'HH:mm'))).forEach(entry => {
        table.push([
          '', // Empty time cell
          hours(entry.minutes),
          entry.description
        ]);
      });
    });
  });

dv.table(['Date', 'Hours', 'Task'], table);

```

---
## Meetings

```dataview  
Table without ID file.link as "Date/Time", description As Description 
From -"3_Resources/Obsidian/Templates" 
WHERE  date >= striptime(this.date)
WHERE  date <= striptime(this.date) + dur(6 days)
WHERE contains(type,"meeting")
Sort file.name ASC
 
```

---
## Papers read

```dataview
TABLE WITHOUT ID link(file.path, title) AS "Title", author AS "First Author", year AS "Year", description AS "Description"
FROM -"3_Resources/Obsidian/Templates"

WHERE  date >= striptime(this.date)
WHERE  date <= striptime(this.date) + dur(6 days)

AND date(file.ctime).year = this.date.year
AND contains(type, "literature")
SORT title ASC

```

---
## Presentations

```dataview  
TABLE without ID link(file.path, title) as "Title", dateformat(date, "yyyy-MM-dd") as Date, description as Description
From -"5_system" 
WHERE  date >= striptime(this.date)
WHERE  date <= striptime(this.date) + dur(6 days)

WHERE contains(type,"presentation")
Sort date ASC

```
---
## Tasks

```tasks
status.type is not CANCELLED

filter by function  task.done.moment?.isSame(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') || (task.scheduled.moment?.isSame(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') && !task.done.moment)|| (task.scheduled.moment?.isBefore(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') && !task.done.moment)|| false


sort by description
group by scheduled



```


---



<%*await tp.file.rename(tp.date.weekday("YYYY-MM-DD", 0)+"_to_"+tp.date.weekday("YYYY-MM-DD", 6));%>
<% tp.user.pin_me() %>


