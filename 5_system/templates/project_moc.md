---
title: about
date: <% tp.file.creation_date("YYYY-MM-DD") %>
aliases:
  - "tag "
type: MOC
status:
tags: 
  -
description: MOC of the ____ Project.
---
## About



----
## Meetings

```dataview
TABLE attendees, description
FROM "0_periodic/meetings"
WHERE any(this.tags, (t) => contains(lower(join(tags, " ")), lower(t)))
SORT file.path DESC

```
---
## Presentations

```dataview
TABLE without ID link(file.path, title) as "Title", dateformat(date, "yyyy-MM-dd") AS Date, description AS Description, file_link AS File
WHERE contains(type, "presentation")
AND any(this.tags, (t) => contains(lower(join(tags, " ")), lower(t)))
SORT file.link DESC

```

---
## Notes

```dataview
TABLE without ID link(file.path) as "Title", description AS "Description" FROM -"0_periodic/daily" AND -"0_periodic/meetings" WHERE any(this.tags, (t) => contains(lower(join(tags, " ")), lower(t))) AND type != "literature" AND type != "presentation" AND type != "writing"
SORT file.path ASC

```

---
## Writing

```dataviewjs
// Retrieve and clean up tags from the current file's YAML if they exist
let currentTags = dv.current().tags ? dv.array(dv.current().tags).map(tag => tag.trim().toLowerCase()) : [];

let pages = dv.pages('"1_projects"')
    .where(p => !p.file.path.includes("0_periodic/meetings") && p.type && p.type.includes("writing"))
    .where(p => p.tags && dv.array(p.tags).some(tag => currentTags.includes(tag.trim().toLowerCase()))) // Check if any tag in the page matches cleaned current tags
    .sort(p => p.file.path);

dv.table(["Title", "Description"], 
    pages.map(p => [
        `[${p.file.path.replace(dv.current().file.folder + "/", "")}](${p.file.path})`, // Display relative path as clickable link
        p.description
    ])
);

```

---
## Literature

```dataview
Table without ID link(file.path, title) as "Title", author as "First Author", year as "Year", description as "Description", zotero_link as "Zotero", file_link as "PDF"
FROM "2_areas/literature/primary_sources"
WHERE any(this.tags, (t) => contains(lower(join(tags, " ")), lower(t)))
SORT file.link ASC

```
---
## Tasks

```tasks
filter by function  !task.isDone
tags include /#
group by scheduled
sort by status
sort by description

 

```



<%*await tp.file.rename("_about");%>
