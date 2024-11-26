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
};

// Define the start and end dates for the desired week
const weekEndDate = dv.current().file.frontmatter.date;
const weekStartDate = moment(weekEndDate).add(-14, 'days').format('YYYY-MM-DD');

// Gather data
dv.pages('"0_periodic"').file.lists
  .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi") && 
  !x.text.includes("#abmi/sick_day") && 
  !x.text.includes("#abmi/vacation_day") && 
  !x.text.includes("#abmi/EMAIL") && 
  !x.text.includes("#abmi/BREAK") &&
  !x.text.includes("#abmi/MEETNG")) // Ignore entries with #abmi/EMAIL, #abmi/BREAK, and #abmi/MEETING
  .array()
  .forEach(x => {
    const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];
    
    // Check if the date falls within the specified week start and end dates
    if (moment(date).isBetween(weekStartDate, weekEndDate, null, '[]')) {
      const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()); // Extract all hashtags
      let description = x.text.replace(tagsRegex, '').trim(); // Remove tags from description
      
      // Remove time entries from the description
      description = description.replace(timeRegex, '').trim();
      
      // Ignore empty descriptions
      if (!description) return;
      
      // Loop through each tag and organize tasks under it
      tags?.forEach(tag => {
        const descriptionTag = tagDescriptions[tag] || tag; // Map tag to description
        if (!tracked[descriptionTag]) tracked[descriptionTag] = new Set();
        tracked[descriptionTag].add(description); // Use a Set to prevent duplicate tasks under the same tag
      });
    }
  });

// Build the markdown-style output
let output = "";
Object.keys(tracked).sort().forEach(descriptionTag => {
  const tasks = Array.from(tracked[descriptionTag]).sort();
  if (tasks.length === 0) return; // Skip empty categories
  output += `### ${descriptionTag}\n`; // Header without space
  tasks.forEach(description => {
    output += `- ${description}\n`;
  });
});

// Render the markdown-style summary
dv.paragraph(output);

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

---

## Notes