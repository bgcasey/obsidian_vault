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
| #abmi/GENWRK | 0.20            |

```dataviewjs
(async () => {
    const tracked = {};
    const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

    // Load the Work Code Lookup Table
    const lookupFilePath = "5_system/tags.md"; // Adjust if needed
    const lookupSection = "## Work Codes";
    const lookupContent = await dv.io.load(lookupFilePath);

    if (!lookupContent) {
        dv.paragraph(`Could not load work tags from ${lookupFilePath}`);
        return;
    }

    // Extract the month from the YAML frontmatter date
    const yamlDate = dv.current().file.frontmatter.date;
    if (!yamlDate) {
        dv.paragraph("Error: No date found in YAML.");
        return;
    }

    const momentDate = moment(yamlDate);
    const monthName = momentDate.format("MMMM YYYY"); // Example: "March 2025"


    // Extract Project Names and Abbreviations from Lookup Table
    const lookupLines = lookupContent.split("\n");
    let inLookupSection = false;
    const projectLookup = new Map();

    for (const line of lookupLines) {
        if (line.trim() === lookupSection) {
            inLookupSection = true;
            continue;
        }
        if (inLookupSection && line.startsWith("##") && line.trim() !== lookupSection) {
            break; // Stop when next heading is found
        }
        if (inLookupSection && line.startsWith("|") && !line.includes("---")) {
            const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
            if (match) {
                const projectName = match[1].trim();
                const abbreviation = match[2].trim();
                projectLookup.set(`#abmi/${abbreviation}`, projectName); // Store mapping
            }
        }
    }

    // Load the current file content
    const filePath = dv.current().file.path;
    const fileContent = await dv.io.load(filePath);

    if (!fileContent) {
        dv.paragraph(`Could not load the content of the file: ${filePath}`);
        return;
    }

    // Extract active project tags and their allocations from "Time Budget" table
    const lines = fileContent.split("\n");
    const sectionHeading = "## Time Budget";
    let inTargetSection = false;
    const activeProjects = new Map(); // Store project allocations

    for (const line of lines) {
        if (line.trim() === sectionHeading) {
            inTargetSection = true;
            continue;
        }
        if (inTargetSection && line.match(/^##+/) && line.trim() !== sectionHeading) {
            break; // Stop at next section
        }
        if (inTargetSection && line.startsWith("|") && !line.includes("---")) {
            const match = line.match(/^\|([^|]+)\|([^|]+)\|/);
            if (match) {
                const projectTag = match[1].trim(); // Extract project tag
                const allocation = parseFloat(match[2].trim()); // Extract allocation as a float
                if (projectTag !== "Project") { // Prevent header row from being added
                    activeProjects.set(projectTag, allocation);
                }
            }
        }
    }


    // Define the start and end dates for the desired month
    const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
    const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

    // Initialize actual work hours tracking
    const totalAbmiTimes = {};
    activeProjects.forEach((_, tag) => totalAbmiTimes[tag] = 0);

    // Gather work log data and filter by active projects
    dv.pages('"0_periodic"').file.lists
        .where(x => x.section.subpath === "Work log" &&
            x.text.includes("#abmi") &&
            !x.text.includes("#abmi/sick_day") &&
            !x.text.includes("#abmi/vacation_day")).array()
        .forEach(x => {
            // Find the start/end times for each bullet point
            const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (times) {
                const start = moment(times[1], 'HH:mm');
                const end = moment(times[2], 'HH:mm');
                const minutes = moment.duration(end.diff(start)).asMinutes();
                const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
                const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD') : null;
                if (!date) return; // Skip if date parsing fails

                // Check if the date falls within the specified month
                if (date.isBetween(monthStartDate, monthEndDate, null, '[]')) {
                    // Extract tags from the note
                    const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()) || [];

                    // Accumulate tag-specific minutes
                    tags.forEach(tag => {
                        if (activeProjects.has(tag)) {
                            totalAbmiTimes[tag] += minutes;
                        }
                    });
                }
            }
        });

    const hours = minutes => (minutes / 60).toFixed(1);

    // Set total work hours per month
    const WORK_HOURS_PER_MONTH = 160;

    // Print the total work hours for the month
    dv.paragraph(`Total work hours for ${monthName}: ${WORK_HOURS_PER_MONTH}`);


    // Compute expected work hours and create table (without "Time Allocation")
    const table = [["Project", "Expected Hours", "Hours Worked", "Hours Left"]];
    activeProjects.forEach((allocation, projectTag) => {
        const expectedHours = (allocation * WORK_HOURS_PER_MONTH).toFixed(1);
        const workedHours = hours(totalAbmiTimes[projectTag] || 0); // Convert minutes to hours
        const hoursLeft = (expectedHours - workedHours).toFixed(1); // Compute remaining hours

        // Convert tag to human-readable name
        const projectName = projectLookup.get(projectTag) || projectTag.replace("#abmi/", ""); // Fallback if not found

        table.push([projectName, expectedHours, workedHours, hoursLeft]);
    });

    // Render the table
    dv.table(table[0], table.slice(1));
})();

```


```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:,\s*#\S+)*/g;

// Define the start and end dates for the desired month
const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

// Gather data
dv.pages('"0_periodic"').file.lists
  .where(x => x.section.subpath === "Work log" && 
  x.text.includes("#abmi") &&
  !x.text.includes("#abmi/sick_day") && 
  !x.text.includes("#abmi/vacation_day")).array()
  .forEach(x => {
    // Find the start/end times for each bullet point
    const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (times) {
      const start = moment(times[1], 'HH:mm');
      const end = moment(times[2], 'HH:mm');
      const minutes = moment.duration(end.diff(start)).asMinutes();
      const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD') : null;
      if (!date) return; // Skip if date parsing fails

      const weekStart = date.clone().startOf('week').format('YYYY-MM-DD');
      const weekEnd = date.clone().endOf('week').format('YYYY-MM-DD');
      const weekStartFormatted = date.clone().startOf('week').format('MM/DD');
      const weekEndFormatted = date.clone().endOf('week').format('MM/DD');
      const week = `[[${weekStart}_to_${weekEnd}|${weekStartFormatted} to ${weekEndFormatted}]]`; // Correctly formatted link with display text

      // Check if the date falls within the specified month start and end dates
      if (date.isBetween(monthStartDate, monthEndDate, null, '[]')) {
        // Extract tags from the note
        const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()); // Extracts all hashtags from the note
        const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, ''); // Extracting text after time values

        if (!tracked[week]) tracked[week] = { entries: [], minutes: 0, tags: {} };
        tracked[week].entries.push({
          path: x.path,
          start: start.format('HH:mm'),
          end: end.format('HH:mm'),
          minutes: minutes,
          tags: tags || [],
          description: description || '' // Initialize description as an empty string
        });
        tracked[week].minutes += minutes;

        // Accumulate tag-specific minutes
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

// Identify all unique #abmi tags
const abmiTags = new Set();
Object.keys(tracked).forEach(week => {
  Object.keys(tracked[week].tags).forEach(tag => {
    abmiTags.add(tag);
  });
});

// Sort abmiTags alphabetically
const sortedAbmiTags = Array.from(abmiTags).sort();

const table = [];
let totalMonthTime = 0;
const totalAbmiTimes = {};

// Initialize total times for each abmi tag
sortedAbmiTags.forEach(tag => {
  totalAbmiTimes[tag] = 0;
});

// Push weekly values and accumulate totals
Object.keys(tracked)
  .sort((a, b) => a.localeCompare(b)) // Sort weeks in ascending order
  .forEach(week => {
    const weekEntry = tracked[week];
    totalMonthTime += weekEntry.minutes;

    // Accumulate totals for each abmi tag
    sortedAbmiTags.forEach(tag => {
      totalAbmiTimes[tag] += weekEntry.tags[tag] || 0;
    });

    // Push weekly summary row
    const row = [
      week, // Enclose week in double square brackets and link back to source file
      hours(weekEntry.minutes)
    ];

    // Add hours for each abmi tag to the row in alphabetical order
    sortedAbmiTags.forEach(tag => {
      row.push(hours(weekEntry.tags[tag] || 0));
    });

    table.push(row);
  });

// Create header row
const header = ['Week', 'Total'];
sortedAbmiTags.forEach(tag => {
  header.push(tag.substring(0, 6)); // Truncate tag names to no more than 6 characters
});

// Calculate percentage row
const percentageRow = [
  'Percent',
  '' // Leave total percentage blank
];
sortedAbmiTags.forEach(tag => {
  const percentage = ((totalAbmiTimes[tag] / totalMonthTime) * 100).toFixed(0);
  percentageRow.push(`${percentage}%`);
});
table.unshift(percentageRow); // Insert the percentage row at the top

// Push total row below the percentage row
const totalRow = [
  'Total',
  hours(totalMonthTime)
];
sortedAbmiTags.forEach(tag => {
  totalRow.push(hours(totalAbmiTimes[tag]));
});
table.splice(1, 0, totalRow); // Insert the total row in second position

// Render the table
dv.table(header, table);

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






