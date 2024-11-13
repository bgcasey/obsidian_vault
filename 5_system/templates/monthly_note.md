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
## Weekly Breakdown
```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:\s\S+)*/g;

// Define the start and end dates for the desired month
const monthStartDate = moment(dv.current().file.frontmatter.date).startOf('month');
const monthEndDate = moment(dv.current().file.frontmatter.date).endOf('month');

// Gather data
dv.pages('"0_periodic"').file.lists
  .where(x => x.section.subpath === "Work log" && 
  x.text.includes("#abmi")).array()
  .forEach(x => {
    const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (times) {
      const start = moment(times[1], 'HH:mm');
      const end = moment(times[2], 'HH:mm');
      const minutes = moment.duration(end.diff(start)).asMinutes();
      const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];

      if (moment(date).isBetween(monthStartDate, monthEndDate, null, '[]')) {
        const weekOfMonth = moment(date).week() - moment(date).startOf('month').week() + 1;
        const monthName = moment(date).format('MMMM');
        const weekStart = moment(date).startOf('week').format('YYYY-MM-DD');
        const weekEnd = moment(date).endOf('week').format('YYYY-MM-DD');
        const week = `[${monthName}, Week ${weekOfMonth}](${weekStart}_to_${weekEnd})`;

        const tags = x.text.match(tagsRegex)?.map(tag => tag.trim());
        const description = x.text.replace(/^\d{2}:\d{2}-\d{2}:\d{2}\s+/, '');

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
              description: description || ''
            }],
            minutes: minutes,
            tags: tags || [],
            description: description || ''
          };
        }
      }
    }
  });

const hours = minutes => (minutes / 60).toFixed(1);

const tables = {};

// Iterate through tracked entries to fill the tables
Object.keys(tracked).sort((a, b) => a.localeCompare(b))
  .forEach(week => {
    const weekEntries = tracked[week];
    const table = [];
    let totalWeekMinutes = 0;

    const sortedDates = Object.keys(weekEntries).sort((a, b) => a.localeCompare(b));

    sortedDates.forEach(date => {
      const dailyEntry = weekEntries[date];
      totalWeekMinutes += dailyEntry.minutes;
      const link = `[[${dailyEntry.path}#Work log|${moment(date).format('dddd D MMMM')}]]`;

      table.push(['**' + link + '**', '**' + hours(dailyEntry.minutes) + '**', '']);

      dailyEntry.entries.sort((a, b) => moment(a.start, 'HH:mm').diff(moment(b.start, 'HH:mm'))).forEach(entry => {
        table.push([
          '',
          hours(entry.minutes),
          entry.description
        ]);
      });
    });

    // Add total hours for the week at the top of each week's table
    table.unshift(['**Total Hours**', '**' + hours(totalWeekMinutes) + '**', '']);
    tables[week] = table;
  });

// Render tables for each week
Object.keys(tables).forEach(week => {
  dv.header(3, week);
  dv.table(['Date', 'Hours', 'Description'], tables[week]); // Include 'Date', 'Hours', and 'Description' in the table header
});

```




<%*tp.file.rename(tp.date.now("YYYY")+"_"+tp.date.now("MM") );%>


<% tp.user.pin_me() %>






