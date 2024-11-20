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
- 
- 
description: "${description}"
---


`;
%>

## Agenda/Questions
- 

---

## Notes
