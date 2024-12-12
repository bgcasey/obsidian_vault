---
date: {{date}}
type: daily
tags: "#daily/{{date:YYYY}}/{{date:MM}}"
description: "Daily note for {{date}}"
---

[[<% tp.date.yesterday() %>|yesterday]]
[[<% tp.date.tomorrow() %>|tomorrow]]
[[0_periodic/weekly/<% tp.date.weekday("YYYY-MM-DD", 0) %>_to_<% tp.date.weekday("YYYY-MM-DD", 6) %>|this week]]
[[0_periodic/monthly/<% tp.date.now("YYYY_MM") %>|this month]]

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
  const timeRangePattern = /^\d{2}:\d{2}-\d{2}:\d{2}/; // Regex for "HH:MM-HH:MM" format
  
  // Track missing #abmi tags
  if (!x.text.includes("#abmi")) {
    warnings.push(`Missing #abmi tag: <div> ${x.text}</div> <br> </span>`);
  }
  
  // Check for improper time format
  if (!timeRangePattern.test(x.text)) {
    warnings.push(`Improper time format: <div> ${x.text}</div> <br> </span>`);
  }
  
// Check for missing description (no text after time entry)
const descriptionPattern = /^\d{2}:\d{2}-\d{2}:\d{2}\s+[^#]+/; // Ensure text exists after time and before any tags
if (!descriptionPattern.test(x.text)) {
  warnings.push(`Missing description after time entry:<div> ${x.text}</div> <br> </span>`);
}


  
  // Calculate total time spent on #abmi/BREAK based on time range format
  if (x.text.includes("#abmi/BREAK")) {
    const timeMatch = x.text.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/); // Match time ranges "HH:MM-HH:MM"
    if (timeMatch) {
      const [_, startTime, endTime] = timeMatch;
      totalBreakMinutes += calculateMinutes(startTime, endTime);
    }
  }
});

// Only show warnings as a callout if there are any issues
if (warnings.length > 0) {
  let calloutContent = warnings.map(entry => `- ${entry}`).join("\n> ");
  dv.paragraph(`> [!WARNING]- Issues detected\n> ${calloutContent}`);
}

// Display remaining break time only if total break time is less than the maximum
if (totalBreakMinutes < maxBreakTime) {
  const remainingMinutes = maxBreakTime - totalBreakMinutes;
  dv.paragraph(`> [!WARNING]- ${remainingMinutes} more minutes of break time \n> `);
}

```
---
## Scratch


