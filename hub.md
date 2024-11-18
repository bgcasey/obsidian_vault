![[IMG_6188_1 2.jpg]]

> [!periodic_hub]- Periodic Notes
> - `= "[[" + dateformat(date(today), "yyyy-MM-dd") + "|today]]"`
> - `= "[[" + dateformat(date(yesterday), "yyyy-MM-dd") + "|yesterday]]"`
> - `= "[[" + dateformat(date(tomorrow), "yyyy-MM-dd") + "|tomorrow]]"`
> - `= "[[0_periodic/weekly/" + dateformat(date(sow) + dur(-1 d), "yyyy-MM-dd") + "_to_" + dateformat(date(eow) + dur(-1 d), "yyyy-MM-dd") + "|this week]]"`
> - `= "[[0_periodic/monthly/" + dateformat(date(today), "yyyy_MM") + "|this month]]"`
> 

> [!hub_projects]- Active Projects
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

> [!hub_time]- Hours Worked
> ```dataviewjs
> // Initialize moment.js for date manipulation
> const moment = window.moment;
> 
> // Get today's date and the start and end of the current week
> const todayDate = moment().format("YYYY-MM-DD");
> const weekStartDate = moment().startOf("week").format("YYYY-MM-DD"); // Sunday
> const weekEndDate = moment().endOf("week").format("YYYY-MM-DD"); // Saturday
> 
> // Initialize variables for daily and weekly calculations
> let totalMinutesToday = 0;
> let totalWeekMinutes = 0;
> 
> // Loop through all work logs to calculate daily and weekly totals
> dv.pages('"0_periodic"')
>   .file.lists
>   .filter((x) => x.section && x.section.subpath === "Work log" && x.text.includes("#abmi"))
>   .forEach((entry) => {
>     const times = entry.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
>     if (times) {
>       const start = moment(times[1], "HH:mm");
>       const end = moment(times[2], "HH:mm");
>       const minutes = moment.duration(end.diff(start)).asMinutes();
>       const entryDate = entry.path.match(/(\d{4}-\d{2}-\d{2})/)[1];
> 
>       // Add to daily total if it's today
>       if (entryDate === todayDate) {
>         totalMinutesToday += minutes;
>       }
> 
>       // Add to weekly total if it's within this week
>       if (moment(entryDate).isBetween(weekStartDate, weekEndDate, null, "[]")) {
>         totalWeekMinutes += minutes;
>       }
>     }
>   });
> 
> // Calculate hours
> const totalHoursToday = (totalMinutesToday / 60).toFixed(1);
> const totalWeekHours = (totalWeekMinutes / 60).toFixed(1);
> const hoursLeftToWork = (40 - totalWeekHours).toFixed(1);
> 
> // Display the results in a callout table
> dv.table(
>   ["Period worked", "Hours"],
>   [
>     ["Today", totalHoursToday],
>     ["This Week", totalWeekHours],
>     ["Remaining", hoursLeftToWork],
>   ]
> );
> 
> ```

> [!hub_people]- Meetings
> ```dataview  
> TABLE description As Description 
> From -"3_resources/obsidian/templates" 
> WHERE  date = date(today)
> WHERE contains(type,"meeting")
> Sort file.name ASC
> Limit 7  
> ```

> [!hub_tasks]- Tasks
> ```tasks
> 
> (scheduled today) AND (not done) OR (done today)
> 
> sort by status
> sort by description
> 
> ```

> [!hub_tags]- Work Tags
> ```dataviewjs
> // Define the file path and section heading
> const filePath = "2_areas/abmi/admin_resources.md"; // Adjust as necessary
> const sectionHeading = "## Work Codes";
> 
> async function renderTable() {
>     // Load the file content
>     const fileContent = await dv.io.load(filePath);
> 
>     if (!fileContent) {
>         dv.paragraph("Could not load the content of the file.");
>         return;
>     }
> 
>     // Split the file content into lines
>     const lines = fileContent.split("\n");
> 
>     // Variables to track the section and table rows
>     let inTargetSection = false;
>     const table = []; // Initialize an empty table
> 
>     for (const line of lines) {
>         // Check if we are entering the target section
>         if (line.trim() === sectionHeading) {
>             inTargetSection = true;
>             continue;
>         }
> 
>         // Exit if we encounter another heading (indicating the section end)
>         if (inTargetSection && line.startsWith("##") && line !== sectionHeading) {
>             inTargetSection = false;
>             break;
>         }
> 
>         // Parse table rows only within the target section
>         if (inTargetSection && line.startsWith("|")) {
>             const match = line.match(/^\|([^|]+)\|([^|]+)\|/); // Match first two columns
>             if (match) {
>                 const [_, name, abbreviation] = match.map((col) => col.trim());
>                 table.push([name, abbreviation]);
>             }
>         }
>     }
> 
>     // Render the table without headers
>     if (table.length > 0) {
>         dv.table([], table); // Pass an empty array as the header
>     } else {
>         dv.paragraph("No table data found in the specified section.");
>     }
> }
> 
> // Call the render function
> renderTable();
> 
> ```



