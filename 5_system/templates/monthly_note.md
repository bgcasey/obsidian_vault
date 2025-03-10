---
date: <% tp.date.now("YYYY-MM-01") %>
type: monthly
tags: "#moc #daily/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %> "
description: Monthly note for <% tp.date.now("MMMM") %> <% tp.date.now("YYYY")%> 
---
# <% tp.date.now("MMMM") %>  <% tp.date.now("YYYY") %>  

[[0_periodic/monthly/<% moment().subtract(1, 'months').format("YYYY_MM") %>|last month]] 
[[0_periodic/monthly/<% moment().add(1, 'months').format("YYYY_MM") %>|next month]]

---
## Time Budget

| Project      | Time allocation |
| ------------ | --------------- |
| #abmi/INVSPC | 0.35            |
| #abmi/PIWO   | 0.35            |
| #abmi/WILDFO | 0.10            |

```dataviewjs
(async () => {
    const WORK_HOURS_PER_MONTH = 168;
    const UNTRACKED_ALLOCATION = 0.2;
    const expectedUntrackedHours = (WORK_HOURS_PER_MONTH * UNTRACKED_ALLOCATION).toFixed(1);

    const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

    const lookupFilePath = "5_system/tags.md";
    const lookupSection = "## Work Codes";
    const lookupContent = await dv.io.load(lookupFilePath);

    if (!lookupContent) {
        dv.paragraph(`Could not load work tags from ${lookupFilePath}`);
        return;
    }

    const yamlDate = dv.current().file.frontmatter.date;
    if (!yamlDate) {
        dv.paragraph("Error: No date found in YAML.");
        return;
    }

    const momentDate = moment(yamlDate);
    const monthName = momentDate.format("MMMM YYYY");

    const lookupLines = lookupContent.split("\n");
    let inLookupSection = false;
    const projectLookup = new Map();

    for (const line of lookupLines) {
        if (line.trim() === lookupSection) {
            inLookupSection = true;
            continue;
        }
        if (inLookupSection && line.startsWith("##") && line.trim() !== lookupSection) {
            break;
        }
        if (inLookupSection && line.startsWith("|") && !line.includes("---")) {
            const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
            if (match) {
                const projectName = match[1].trim();
                const abbreviation = match[2].trim();
                projectLookup.set(`#abmi/${abbreviation}`, projectName);
            }
        }
    }

    const filePath = dv.current().file.path;
    const fileContent = await dv.io.load(filePath);

    if (!fileContent) {
        dv.paragraph(`Could not load the content of the file: ${filePath}`);
        return;
    }

    const lines = fileContent.split("\n");
    const sectionHeading = "## Time Budget";
    let inTargetSection = false;
    const activeProjects = new Map();

    for (const line of lines) {
        if (line.trim() === sectionHeading) {
            inTargetSection = true;
            continue;
        }
        if (inTargetSection && line.match(/^##+/) && line.trim() !== sectionHeading) {
            break;
        }
        if (inTargetSection && line.startsWith("|") && !line.includes("---")) {
            const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
            if (match) {
                const projectTag = match[1].trim();
                const allocation = parseFloat(match[2].trim());
                if (projectTag !== "Project") {
                    activeProjects.set(projectTag, allocation);
                }
            }
        }
    }

    const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
    const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

    const totalAbmiTimes = {};
    activeProjects.forEach((_, tag) => totalAbmiTimes[tag] = 0);
    let untrackedWorkMinutes = 0;

    dv.pages('"0_periodic"').file.lists
        .where(x => x.section.subpath === "Work log" &&
            x.text.includes("#abmi") &&
            !x.text.includes("#abmi/BREAK") &&
            !x.text.includes("#abmi/SOCIAL") &&
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

                if (date.isBetween(monthStartDate, monthEndDate, null, '[]')) {
                    const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()) || [];
                    tags.forEach(tag => {
                        if (activeProjects.has(tag)) {
                            totalAbmiTimes[tag] += minutes;
                        } else if (tag.startsWith("#abmi/")) {
                            untrackedWorkMinutes += minutes;
                        }
                    });
                }
            }
        });

    const hours = minutes => (minutes / 60).toFixed(1);

    const table = [["Project", "Expected Hours", "Hours Worked", "Hours Left"]];
    const labels = [];
    const expectedHours = [];
    const workedHours = [];

    activeProjects.forEach((allocation, projectTag) => {
        const expected = (allocation * WORK_HOURS_PER_MONTH).toFixed(1);
        const worked = hours(totalAbmiTimes[projectTag] || 0);
        const remaining = (expected - worked).toFixed(1);
        const projectName = projectLookup.get(projectTag) || projectTag.replace("#abmi/", "");

        labels.push(projectName);
        expectedHours.push(expected);
        workedHours.push(worked);

        table.push([projectName, expected, worked, remaining]);
    });

    if (untrackedWorkMinutes > 0) {
        const worked = hours(untrackedWorkMinutes);
        const remaining = (expectedUntrackedHours - worked).toFixed(1);
        labels.push("Admin, Meetings, General Work");
        expectedHours.push(expectedUntrackedHours);
        workedHours.push(worked);

        table.push(["Admin, Meetings, General Work", expectedUntrackedHours, worked, remaining]);
    }

    // Print expected total work hours
    dv.paragraph(`Expected Total Work Hours for ${monthName}: ${WORK_HOURS_PER_MONTH}`);

    // Add a spacer for separation
    dv.paragraph('<div style="height: 15px;"></div>');

    // Render the table
    dv.table(table[0], table.slice(1));

    // Add a spacer for separation
    dv.paragraph('<div style="height: 20px;"></div>');

    // Create and render the stacked horizontal bar chart
    const ctx = dv.el("canvas", null);
    await import("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.2.1/chart.umd.js");

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Worked Hours',
                    data: workedHours,
                    backgroundColor: 'rgba(120, 144, 156, 0.6)',
                    borderColor: 'rgba(120, 144, 156, 1)',
                    borderWidth: 1,
                    barThickness: 25
                },
                {
                    label: 'Remaining Hours',
                    data: expectedHours.map((total, idx) => (total - workedHours[idx]).toFixed(1)),
                    backgroundColor: 'rgba(176, 190, 197, 0.6)',
                    borderColor: 'rgba(176, 190, 197, 1)',
                    borderWidth: 1,
                    barThickness: 25
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true
                },
                y: {
                    stacked: true,
                    categoryPercentage: 1,
                    barPercentage: 0.9
                }
            }
        }
    });
})();


```



```dataviewjs
(async () => {
    const tracked = {};
    const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

    const lookupFilePath = "5_system/tags.md";
    const lookupSection = "## Work Codes";
    const lookupContent = await dv.io.load(lookupFilePath);

    if (!lookupContent) {
        dv.paragraph(`Could not load work tags from ${lookupFilePath}`);
        return;
    }

    const lookupLines = lookupContent.split("\n");
    let inLookupSection = false;
    const projectLookup = new Map();

    for (const line of lookupLines) {
        if (line.trim() === lookupSection) {
            inLookupSection = true;
            continue;
        }
        if (inLookupSection && line.startsWith("##") && line.trim() !== lookupSection) {
            break;
        }
        if (inLookupSection && line.startsWith("|") && !line.includes("---")) {
            const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
            if (match) {
                const projectName = match[1].trim();
                const abbreviation = match[2].trim();
                projectLookup.set(abbreviation, projectName);
            }
        }
    }

    const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
    const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

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
                const weekStartFormatted = date.clone().startOf('week').format('MM/DD');
                const weekEndFormatted = date.clone().endOf('week').format('MM/DD');
                const week = `[[${weekStart}_to_${weekEnd}|${weekStartFormatted} to ${weekEndFormatted}]]`;

                if (date.isBetween(monthStartDate, monthEndDate, null, '[]')) {
                    const tags = x.text.match(tagsRegex)?.map(tag => tag.trim());
                    const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, '');

                    if (!tracked[week]) tracked[week] = { entries: [], minutes: 0, tags: {} };
                    tracked[week].entries.push({
                        path: x.path,
                        start: start.format('HH:mm'),
                        end: end.format('HH:mm'),
                        minutes: minutes,
                        tags: tags || [],
                        description: description || ''
                    });
                    tracked[week].minutes += minutes;

                    tags?.forEach(tag => {
                        if (tag.startsWith('#abmi/')) {
                            const tagName = tag.replace('#abmi/', '');
                            if (!tracked[week].tags[tagName]) tracked[week].tags[tagName] = 0;
                            tracked[week].tags[tagName] += minutes;
                        }
                    });
                }
            }
        });

    const hours = minutes => (minutes / 60).toFixed(1);

    const abmiTags = new Set();
    Object.keys(tracked).forEach(week => {
        Object.keys(tracked[week].tags).forEach(tag => {
            abmiTags.add(tag);
        });
    });

    const sortedAbmiTags = Array.from(abmiTags).sort();

    const table = [];
    let totalMonthTime = 0;
    const totalAbmiTimes = {};

    sortedAbmiTags.forEach(tag => {
        totalAbmiTimes[tag] = 0;
    });

    Object.keys(tracked).sort((a, b) => a.localeCompare(b)).forEach(week => {
        const weekEntry = tracked[week];
        totalMonthTime += weekEntry.minutes;

        sortedAbmiTags.forEach(tag => {
            totalAbmiTimes[tag] += weekEntry.tags[tag] || 0;
        });

        const row = [week, hours(weekEntry.minutes)];
        sortedAbmiTags.forEach(tag => {
            row.push(hours(weekEntry.tags[tag] || 0));
        });

        table.push(row);
    });

    const header = ['Week', 'Total'];
    sortedAbmiTags.forEach(tag => {
        header.push(tag.substring(0, 6));
    });

    const percentageRow = ['Percent', ''];
    const percentages = [];
    const projectLabels = [];
    sortedAbmiTags.forEach(tag => {
        const percentage = ((totalAbmiTimes[tag] / totalMonthTime) * 100).toFixed(0);
        percentages.push(percentage);
        percentageRow.push(`${percentage}%`);
        projectLabels.push(projectLookup.get(tag) || tag);
    });
    table.unshift(percentageRow);

    const totalRow = ['Total', hours(totalMonthTime)];
    sortedAbmiTags.forEach(tag => {
        totalRow.push(hours(totalAbmiTimes[tag]));
    });
    table.splice(1, 0, totalRow);

    // Render the table
    dv.table(header, table);

    // Add a spacer for separation
    dv.paragraph('<div style="height: 30px;"></div>');

    // Render the percentage horizontal bar chart
    const ctx = dv.el("canvas", null);
    await import("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.2.1/chart.umd.js");

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
                    grid: {
                        display: false // Disable x-axis grid
                    },
                    ticks: {
                        callback: function (value) {
                            return value + "%";
                        }
                    }
                },
                y: {
                    grid: {
                        display: false // Disable y-axis grid
                    }
                }
            }
        }
    });
})();

```

---
## Meetings 

```dataview  
TABLE without ID file.link as "Date/Time", description As Description
From -"5_system" 
WHERE  date.year = this.date.year
WHERE  date.month = this.date.month

WHERE contains(type,"meeting")
Sort file.name ASC

```

----
## Presentations

```dataview  
TABLE without ID file.link as "Date/Time", description As Description, file_link As File
From -"5_system" 
WHERE  date.year = this.date.year
WHERE  date.month = this.date.month

WHERE contains(type,"presentation")
Sort file.name ASC

```
---
## Papers read

```dataview
TABLE WITHOUT ID link(file.path, title) AS "Title", author AS "First Author", year AS "Year", description AS "Description"
FROM -"3_Resources/Obsidian/Templates"
WHERE date(file.ctime).month = this.date.month
AND date(file.ctime).year = this.date.year
AND contains(type, "literature")
SORT title ASC

```

---
## Work Summary
```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:\s\S+)*/g;
const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}\s*/; // Regex to remove time entries from tasks

// Define the start and end dates for the desired month
const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

// Tag-to-description mapping
const tagDescriptions = {
  "#abmi/ADMIN": "Administrative",
  "#abmi/BIOSCI": "Biodiversity Indicators",
  "#abmi/FRHLTH": "Forest Health",
  "#abmi/GENWRK": "General Work",
  "#abmi/GENRES": "General Research/Reading",
  "#abmi/INVSPC": "Invasive Species",
  "#abmi/ONBOAR": "Onboarding",
  "#abmi/PIWO": "Pileated Woodpecker (PIWO)",
  "#abmi/PRVSIT": "Private Sites",
  "#abmi/PRODEV": "Professional Development",
  "#abmi/REMINT": "Remote Sensing Integration",
  "#abmi/REPROD": "Reproducibility",
  "#abmi/SOCIAL": "Team Building",
  "#abmi/WILDFO": "Wildland Foundations"
};

// Gather data
dv.pages('"0_periodic"').file.lists
  .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi")).array()
  .forEach(x => {
    const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (times) {
      const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];

      if (moment(date).isBetween(monthStartDate, monthEndDate, null, '[]')) {
        const tags = x.text.match(tagsRegex)
          ?.filter(tag => tag.startsWith("#abmi/") && 
            !["#abmi/BREAK", "#abmi/EMAIL", "#abmi/MEETNG"].includes(tag.trim()))
          ?.map(tag => tag.trim());
        
        if (!tags || tags.length === 0) return; // Ignore tasks without valid tags

        let description = x.text.replace(tagsRegex, '').trim();
        description = description.replace(timeRegex, '').trim();

        tags.forEach(tag => {
          const descriptionTag = tagDescriptions[tag] || tag;
          if (!tracked[descriptionTag]) tracked[descriptionTag] = [];
          tracked[descriptionTag].push({ description, date, path: x.path });
        });
      }
    }
  });

// Render consolidated summaries by category
Object.keys(tracked).sort().forEach(category => {
  const tasks = tracked[category].sort((a, b) => moment(a.date).diff(moment(b.date)));
  if (tasks.length === 0) return; // Skip empty categories

  dv.header(3, category);

  let output = "";
  tasks.forEach(task => {
    const dateLink = `[[${task.path}#Work log|${task.date}]]`;
    output += `-  ${task.description} (${dateLink})\n`;
  });

  dv.paragraph(output);
});

```




<%*tp.file.rename(tp.date.now("YYYY")+"-"+tp.date.now("MM") );%>


<% tp.user.pin_me() %>






