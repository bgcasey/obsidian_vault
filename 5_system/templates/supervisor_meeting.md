<%*
/**
 * Templater Script Block: This will execute the file renaming
 * and extract information from the content of the file.
 * 
 * Instructions:
 * The date and time in the file should be in the following format:
 * Dec 13, 2022 at 11:00 AM to 12:00 PM, MDT
 */

// Get the file content
let content = tp.file.content;
console.log("Content:", content);

// Regular expression to extract the meeting date and time
let dateMatch = content.match(/(\w+\s\d{1,2},\s\d{4})\sat\s(\d{1,2}:\d{2}\s?[AP]M)\sto\s(\d{1,2}:\d{2}\s?[AP]M)/i);
console.log("Date Match:", dateMatch);

// Initialize variables for the YAML frontmatter
let meetingDate = tp.date.now("YYYY-MM-DD"); // fallback date if extraction fails
let meetingTime = tp.date.now("HH-mm"); // fallback time if extraction fails
let dailyTag = `#daily/${tp.date.now('YYYY/MM')}`; // fallback tag if extraction fails

// If the match exists, format the date and time for YAML and renaming
if (dateMatch) {
  let parsedDate = moment(dateMatch[1], "MMM D, YYYY");
  let parsedStartTime = moment(dateMatch[2], "h:mm A");
  let parsedEndTime = moment(dateMatch[3], "h:mm A");
  console.log("Parsed Date:", parsedDate);
  console.log("Parsed Start Time:", parsedStartTime);
  console.log("Parsed End Time:", parsedEndTime);

  if (parsedDate.isValid() && parsedStartTime.isValid() && parsedEndTime.isValid()) {
    meetingDate = parsedDate.format("YYYY-MM-DD");
    meetingTime = parsedStartTime.format("HH-mm");
    dailyTag = `#daily/${parsedDate.format('YYYY/MM')}`;
    
    console.log("Meeting Date:", meetingDate);
    console.log("Meeting Time:", meetingTime);
    console.log("Daily Tag:", dailyTag);
    
    // Rename the file with the meeting date and time
    await tp.file.rename(`${meetingDate}_${meetingTime}`);
  } else {
    console.error("Invalid date or time format.");
  }
}

// Extract the first non-empty line for the description and remove any bold markings
let description = content.split('\n').find(line => line.trim() !== '').replace(/\*\*/g, '');
console.log("Description:", description);

// Output the variables for use in the YAML frontmatter
tR += `---
date: ${meetingDate}
type: meeting
tags: "${dailyTag}"
attendees:
- Brandon Allen
description: "${description}"
---
`;
%>
## Agenda/Questions
- 

---
## Work Summary

```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:\s\S+)*/g;
const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}\s*/; // Regex to remove time entries from tasks

// Define the start and end dates for the desired week
const weekEndDate = dv.current().file.frontmatter.date;
const weekStartDate = moment(weekEndDate).add(-14, 'days').format('YYYY-MM-DD');


// Tag-to-description mapping
const tagDescriptions = {
  "#abmi/ADMIN": "Administrative",
  "#abmi/BIOSCI": "Biodiversity Indicators",
  "#abmi/BREAK": "Breaks",
  "#abmi/EMAIL": "Email/Communication",
  "#abmi/FRHLTH": "Forest Health",
  "#abmi/GENWRK": "General Work",
  "#abmi/GENRES": "General Research/Reading",
  "#abmi/INVSPC": "Invasive Species",
  "#abmi/MEETNG": "Meetings",
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

      if (moment(date).isBetween(weekStartDate, weekEndDate, null, '[]')) {
        const tags = x.text.match(tagsRegex)
          ?.filter(tag => tag.startsWith("#abmi/") && 
            !["#abmi/BREAK", "#abmi/EMAIL", "#abmi/MEETNG", "#abmi/ADMIN"].includes(tag.trim()))
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

### Meetings

```dataview  
TABLE without ID file.link as "Date/Time", description As Description 
From -"3_Resources/Obsidian/Templates" 
WHERE  date <= striptime(this.date)
WHERE  date >= striptime(this.date) - dur(14 days)
WHERE contains(type,"meeting")
Sort file.name ASC
```

### Presentations

```dataview  
TABLE without ID file.link as "Date/Time", description As Description 
From -"3_Resources/Obsidian/Templates" 
WHERE  date <= striptime(this.date)
WHERE  date >= striptime(this.date) - dur(14 days)
WHERE contains(type,"presentation")
Sort file.name ASC
```

### Papers read

```dataview
Table without ID link(file.path, title) as "Title", author as "First Author", year as "Year", description as "Description"
From -"3_Resources/Obsidian/Templates" 
WHERE  file.cday <= striptime(this.date)
WHERE  file.cday >= striptime(this.date) - dur(14 days)
WHERE contains(type,"literature")
SORT title ASC

```

---

## Notes