---
date: {{date}}
type: daily
tags: "#daily/{{date:YYYY}}/{{date:MM}}"
description: "Daily note for {{date}}"
---

> [!periodic]- Periodic Notes
> [[<% tp.date.yesterday() %>|yesterday]]
> [[<% tp.date.tomorrow() %>|tomorrow]]
> [[0_periodic/weekly/<% tp.date.weekday("YYYY-MM-DD", 0) %>_to_<% tp.date.weekday("YYYY-MM-DD", 6) %>|this week]]
> [[0_periodic/monthly/<% tp.date.now("YYYY_MM") %>|this month]]
> 
> [[presentations_moc]]
> [[meetings_moc]]

> [!projects]- Active Projects
> ```dataviewjs
> // Function to replace underscores with spaces
> function replaceUnderscores(str) {
>   return str.replace(/_/g, ' ');
> }
> 
> const projects = dv.pages('"1_projects"')
>   .where(p => p.status === "active")
>   .sort(p => p.file.folder, 'asc');
> 
> const table = [];
> table.push(["Active Projects", "", ""]);
> 
> projects.forEach(p => {
>   const projectName = p.file.folder.split("/").pop();
>   const projectTitle = replaceUnderscores(projectName);
>   const projectPath = "1_projects/active/" + projectName;
>   table.push([
>     projectTitle,
>     `[[${projectPath}/about|about]]`,
>     `[[${projectPath}/scratch|scratch]]`
>   ]);
> });
> 
> dv.table(table[0], table.slice(1));
> ```

> [!time]- Hours Worked
> ```dataviewjs
> // Initialize moment.js for date manipulation
> const moment = window.moment;
> 
> // Initialize variables for daily calculations
> const lists = dv.current().file.lists
>   .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi"))
>   .array();
> let totalMinutes = 0;
> 
> // Process each work log entry for daily total
> lists.forEach(x => {
>   const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
>   if (times) {
>     const start = moment(times[1], 'HH:mm');
>     const end = moment(times[2], 'HH:mm');
>     const minutes = moment.duration(end.diff(start)).asMinutes();
>     totalMinutes += minutes;
>   }
> });
> 
> const totalHours = (totalMinutes / 60).toFixed(1);
> //dv.paragraph(`Total Hours: ${totalHours}`);
> 
> // Initialize variables for weekly calculations
> const tracked = {};
> const weekStartDate = moment(dv.current().file.frontmatter.date).startOf('week').format('YYYY-MM-DD'); // Sunday
> const weekEndDate = moment(dv.current().file.frontmatter.date).endOf('week').format('YYYY-MM-DD'); // Saturday
> 
> // Process each work log entry for weekly total
> dv.pages('"0_periodic"').file.lists
>   .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi"))
>   .array()
>   .forEach(x => {
>     const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
>     if (times) {
>       const start = moment(times[1], 'HH:mm');
>       const end = moment(times[2], 'HH:mm');
>       const minutes = moment.duration(end.diff(start)).asMinutes();
>       const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];
>       
>       if (moment(date).isBetween(weekStartDate, weekEndDate, null, '[]')) {
>         const week = `[[${weekStartDate}_to_${weekEndDate}]]`;
>         if (!tracked[week]) tracked[week] = 0;
>         tracked[week] += minutes;
>       }
>     }
>   });
> 
> let totalWeekMinutes = 0;
> Object.keys(tracked).forEach(weekDate => {
>   totalWeekMinutes += tracked[weekDate];
> });
> 
> const totalWeekHours = (totalWeekMinutes / 60).toFixed(1);
> //dv.paragraph(`**Total Hours worked in the week: ${totalWeekHours}**`);
> 
> const hoursLeftToWork = (40 - totalWeekHours).toFixed(1);
> // Display results in a table
> 
> dv.table(
>   ["Period worked", "Hours"],
>   [
>     ["Today", totalHours],
>     ["This Week", totalWeekHours],
>     ["Remaining", hoursLeftToWork]
>   ]
> );
> ```

> [!people]- Meetings
> ```dataview  
> TABLE description As Description 
> From -"3_resources/obsidian/templates" 
> WHERE  date = striptime(this.date)
> WHERE contains(type,"meeting")
> Sort file.name ASC
> Limit 7  
> ```

> [!tasks]- 
> ```tasks
> status.type is not CANCELLED
> 
> filter by function task.done.moment?.isSame(moment("{{date}}"), 'day') || (task.scheduled.moment?.isSame(moment("{{date}}"), 'day') && !task.done.moment)||(task.scheduled.moment?.isBefore(moment("{{date}}"), 'day') && !task.done.moment)|| false
> 
> sort by status
> 
> sort by description
> 
> ```

> [!tags]- Work Tags
> ![[admin_resources#Work Codes]]
> ---
> 
> 

---
## Work log

- 


<% tp.user.pin_me() %>
```dataviewjs
// Initialize variables for today's work log
const lists = dv.current().file.lists
  .where(x => x.section.subpath === "Work log")
  .array();
let warnings = [];
let totalBreakMinutes = 0;
const maxBreakTime = 30;  // Maximum allowable break time in minutes

// Function to calculate minutes between two times in the format "HH:MM"
function calculateMinutes(start, end) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

// Check each work log entry in today's note
lists.forEach(x => {
  // Track missing #abmi tags
  if (!x.text.includes("#abmi")) {
    warnings.push(x.text);
  }
  
  // Calculate total time spent on #abmi/BREAK based on time range format
  if (x.text.includes("#abmi/BREAK")) {
    const timeMatch = x.text.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);  // Match time ranges "HH:MM-HH:MM"
    if (timeMatch) {
      const [_, startTime, endTime] = timeMatch;
      totalBreakMinutes += calculateMinutes(startTime, endTime);
    }
  }
});

// Only show warnings as a callout if there are missing #abmi tags
if (warnings.length > 0) {
  let calloutContent = warnings.map(entry => `- ${entry}`).join("\n> ");
  dv.paragraph(`> [!WARNING]- missing tag\n> ${calloutContent}`);
}

// Display remaining break time only if total break time is less than the maximum
if (totalBreakMinutes < maxBreakTime) {
  const remainingMinutes = maxBreakTime - totalBreakMinutes;
  dv.paragraph(`> [!WARNING]- ${remainingMinutes} more minutes of break time \n> `);
}

```
---
## Scratch


