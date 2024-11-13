---
date: <% tp.date.weekday("YYYY-MM-DD", 0) %>
type: weekly
tags: "#moc #daily/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %> "
description: Weekly note from <% tp.date.weekday("YYYY-MM-DD", 0)%> to <% tp.date.weekday("YYYY-MM-DD", 6)%>
banked_time: 
---


> [!periodic]- Periodic Notes
> [[<% tp.date.weekday("YYYY-MM-DD", -7) %>_to_<% tp.date.weekday("YYYY-MM-DD", -1) %>|last week]]
> [[<% tp.date.weekday("YYYY-MM-DD", 7) %>_to_<% tp.date.weekday("YYYY-MM-DD", 13) %>|next week]]
> [[0_periodic/monthly/<% tp.date.now("YYYY_MM") %>|this month]]
> [[0_periodic/training/<% tp.date.weekday("YYYY-MM-DD", 0) %>_to_<% tp.date.weekday("YYYY-MM-DD", 6) %>|training log]]

> [!Time]+ Hours Worked
> ```dataviewjs
const tracked = {};
const tagsRegex = /#\S+(?:,\s*#\S+)*/g;
> 
> // Define the start date for the desired week
> const weekStartDate = dv.current().file.frontmatter.date;
> 
> // Define the end date for the desired week by adding 6 days to weekStartDate
> const weekEndDate = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');
> 
> // Gather data
> dv.pages('"0_periodic"').file.lists
>   .where(x => x.section.subpath === "Work log" && 
>   x.text.includes("#abmi") &&
>   !x.text.includes("#abmi/sick_day") && 
>   !x.text.includes("#abmi/vacation_day")).array()
>   .forEach(x => {
>     // Find the start/end times for each bullet point
>     const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/);
>     if (times) {
>       const start = moment(times[1], 'HH:mm');
>       const end = moment(times[2], 'HH:mm');
>       const minutes = moment.duration(end.diff(start)).asMinutes();
>       const dateMatch = x.path.match(/(\d{4}-\d{2}-\d{2})/);
>       const date = dateMatch ? moment(dateMatch[1], 'YYYY-MM-DD') : null;
>       if (!date) return;
> 
>       const weekStart = date.clone().startOf('week').format('YYYY-MM-DD');
>       const weekEnd = date.clone().endOf('week').format('YYYY-MM-DD');
>       const week = `[[${weekStart}_to_${weekEnd}]]`;
> 
>       if (date.isBetween(weekStartDate, weekEndDate, null, '[]')) {
>         const tags = x.text.match(tagsRegex)?.map(tag => tag.trim());
>         const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, '');
> 
>         if (!tracked[week]) tracked[week] = {};
>         if (tracked[week][date]) {
>           tracked[week][date].entries.push({
>             path: x.path,
>             start: start.format('HH:mm'),
>             end: end.format('HH:mm'),
>             minutes: minutes,
>             tags: tags || [],
>             description: description || ''
>           });
>           tracked[week][date].minutes += minutes;
>           tracked[week][date].tags = [...new Set(tracked[week][date].tags.concat(tags || []))];
>         } else {
>           tracked[week][date] = {
>             path: x.path,
>             entries: [{
>               path: x.path,
>               start: start.format('HH:mm'),
>               end: end.format('HH:mm'),
>               minutes: minutes,
>               tags: tags || [],
>               description: description || ''
>             }],
>             minutes: minutes,
>             tags: tags || [],
>             description: description || ''
>           };
>         }
>       }
>     }
>   });
> 
> const hours = minutes => (minutes / 60).toFixed(1);
> 
> // Identify all unique #abmi tags and sort them alphabetically
> const abmiTags = new Set();
> Object.keys(tracked).forEach(week => {
>   Object.keys(tracked[week]).forEach(date => {
>     tracked[week][date].entries.forEach(entry => {
>       entry.tags.forEach(tag => {
>         if (tag.startsWith('#abmi/')) {
>           abmiTags.add(tag.replace('#abmi/', ''));
>         }
>       });
>     });
>   });
> });
> const sortedAbmiTags = Array.from(abmiTags).sort();
> 
> const table = [];
> let totalWeekTime = 0;
> const totalAbmiTimes = {};
> 
> // Initialize total times for each abmi tag
> sortedAbmiTags.forEach(tag => {
>   totalAbmiTimes[tag] = 0;
> });
> 
> // Push daily values and accumulate totals
> Object.keys(tracked)
>   .sort((a, b) => moment(b.split('_to_')[0]).diff(moment(a.split('_to_')[0]))) // Sort weeks in descending order by week start date
>   .forEach(week => {
>     Object.keys(tracked[week])
>       .sort((a, b) => moment(b).diff(moment(a))) // Sort dates in descending order within each week
>       .forEach(date => {
>         const dailyEntry = tracked[week][date];
>         const dailyTotal = dailyEntry.entries.reduce((acc, curr) => acc + curr.minutes, 0);
>         totalWeekTime += dailyTotal;
> 
>         // Accumulate totals for each abmi tag
>         sortedAbmiTags.forEach(tag => {
>           totalAbmiTimes[tag] += getTaggedMinutes(dailyEntry.entries, `#abmi/${tag}`);
>         });
> 
>         // Push daily summary row with date linking to the file
>         const link = `[[${dailyEntry.path}#Work log|${moment(date).format('dddd D MMMM')}]]`;
>         const row = [
>           link,
>           hours(dailyTotal)
>         ];
> 
>         // Add hours for each abmi tag in alphabetical order
>         sortedAbmiTags.forEach(tag => {
>           row.push(hours(getTaggedMinutes(dailyEntry.entries, `#abmi/${tag}`)));
>         });
> 
>         table.push(row);
>       });
>   });
> 
> // Create header row and sort columns alphabetically after Day/Week and Total
> const header = ['Day/Week', 'Total'];
> sortedAbmiTags.forEach(tag => {
>   header.push(tag.substring(0, 6));
> });
> 
> // Push total row
> const totalRow = [
>   '**Total**',
>   `**${hours(totalWeekTime)}**`
> ];
> sortedAbmiTags.forEach(tag => {
>   totalRow.push(`**${hours(totalAbmiTimes[tag])}**`);
> });
> table.unshift(totalRow);
> 
> // Calculate percentage row
> const percentageRow = [
>   '**Percent**',
>   '' // Leave total percentage blank
> ];
> sortedAbmiTags.forEach(tag => {
>   const percentage = ((totalAbmiTimes[tag] / totalWeekTime) * 100).toFixed(0);
>   percentageRow.push(`${percentage}%`);
> });
> table.unshift(percentageRow); // Insert the percentage row at the top
> 
> // Render the table
> dv.table(header, table);
> 
> function getTaggedMinutes(entries, tag) {
>   return entries.reduce((total, entry) => {
>     if (entry.tags.includes(tag)) {
>       total += entry.minutes;
>     }
>     return total;
>   }, 0);
> }
> 

> [!Time]- Work Log
> ```dataviewjs
> const tracked = {};
> const tagsRegex = /#\S+(?:\s\S+)*/g;
> 
> // Define the start and end dates for the desired week
> const weekStartDate = dv.current().file.frontmatter.date;
> const weekEndDate = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');
> 
> // Gather data
> dv.pages('"0_periodic"').file.lists
>   .where(x => x.section.subpath === "Work log" && x.text.includes("#abmi") && 
> !x.text.includes("#abmi/sick_day") && 
> !x.text.includes("#abmi/vacation_day")).array() // Add condition to exclude entries with tags "#sick_day"  or "vacation_day"
>   .forEach(x => {
>     // Find the start/end times for each bullet point
>     const times = x.text.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})/)
>     if (times) {
>       const start = moment(times[1], 'HH:mm');
>       const end = moment(times[2], 'HH:mm');
>       const minutes = moment.duration(end.diff(start)).asMinutes();
>       const date = x.path.match(/(\d{4}-\d{2}-\d{2})/)[1];
>       
>       // Check if the date falls within the specified week start and end dates
>       if (moment(date).isBetween(weekStartDate, weekEndDate, null, '[]')) {
>         const week = `[[${weekStartDate}_to_${weekEndDate}]]`;
>         // Extract tags from the note
>         const tags = x.text.match(tagsRegex)?.map(tag => tag.trim()); // Extracts all hashtags from the note
>         const description = x.text.replace(/^(\d{2}:\d{2}-\d{2}:\d{2}\s)/, ''); // Extracting text after time values
> 
>         if (!tracked[week]) tracked[week] = {};
>         if (tracked[week][date]) {
>           tracked[week][date].entries.push({
>             path: x.path,
>             start: start.format('HH:mm'),
>             end: end.format('HH:mm'),
>             minutes: minutes,
>             tags: tags || [],
>             description: description || '' // Initialize description as an empty string
>           });
>           tracked[week][date].minutes += minutes;
>           // Append tags to the existing tracked entry
>           tracked[week][date].tags = [...new Set(tracked[week][date].tags.concat(tags || []))];
>         } else {
>           tracked[week][date] = {
>             path: x.path,
>             entries: [{
>               path: x.path,
>               start: start.format('HH:mm'),
>               end: end.format('HH:mm'),
>               minutes: minutes,
>               tags: tags || [],
>               description: description || '' // Initialize description as an empty string
>             }],
>             minutes: minutes,
>             tags: tags || [],
>             description: description || '' // Initialize description as an empty string
>           };
>         }
>       }
>     }
>   });
> 
> const hours = minutes => (minutes / 60).toFixed(1);
> 
> const table = [];
> let totalWeekMinutes = 0;
> 
> // Calculate total hours before iterating through daily entries
> Object.keys(tracked).sort((a, b) => b.localeCompare(a))
>   .forEach(weekDate => {
>     const weekEntries = tracked[weekDate];
> 
>     Object.keys(weekEntries).forEach(date => {
>       totalWeekMinutes += weekEntries[date].minutes;
>     });
>   });
> 
> // Push total hours row to the top of the table
> table.push(['**Total Hours**', '**' + hours(totalWeekMinutes) + '**', '']);
> 
> // Iterate through tracked entries to fill the table
> Object.keys(tracked).sort((a, b) => b.localeCompare(a))
>   .forEach(weekDate => {
>     const weekEntries = tracked[weekDate];
> 
>     // Sort daily values within the week summary in descending order by date
>     const sortedDates = Object.keys(weekEntries).sort((a, b) => b.localeCompare(a));
> 
>     sortedDates.forEach(date => {
>       const dailyEntry = weekEntries[date];
>       const link = `[[${dailyEntry.path}#Work log|${moment(date).format('dddd D MMMM')}]]`;
> 
>       // Push daily summary above the entries for each day
>       table.push(['**' + link + '**', '**' + hours(dailyEntry.minutes) + '**', '']);
> 
>       // Push individual time entries (sorted in descending order) with empty time cells
>       dailyEntry.entries.sort((a, b) => moment(b.start, 'HH:mm').diff(moment(a.start, 'HH:mm'))).forEach(entry => {
>         table.push([
>           '', // Empty time cell
>           hours(entry.minutes),
>           entry.description
>         ]);
>       });
>     });
>   });
> 
> dv.table(['Date', 'Hours', 'Description'], table);
> ```

> [!people]- Meetings
> ```dataview  
> Table without ID file.link as "Date/Time", description As Description 
> From -"3_Resources/Obsidian/Templates" 
> WHERE  date >= striptime(this.date)
> WHERE  date <= striptime(this.date) + dur(6 days)
> WHERE contains(type,"meeting")
> Sort file.name ASC
> 
> ```

> [!tasks]+  [[maps_of_content/tasks|Tasks]]
> ```tasks
> status.type is not CANCELLED
> 
> filter by function  task.done.moment?.isSame(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') || (task.scheduled.moment?.isSame(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') && !task.done.moment)|| (task.scheduled.moment?.isBefore(moment("<% tp.date.weekday("YYYY-MM-DD", 0) %>"), 'week') && !task.done.moment)|| false
> 
> 
> sort by description
> group by scheduled
> 
> 
> 
> ```


<%*tp.file.rename(tp.date.weekday("YYYY-MM-DD", 0)+"_to_"+tp.date.weekday("YYYY-MM-DD", 6));%>
<% tp.user.pin_me() %>


