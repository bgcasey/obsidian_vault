---
title: presentations_moc
date: 2024-10-13
type: general
tags: " #moc #presentation    "
description: Table view of presentations
---

```dataview
TABLE without ID link(file.path, title) as "Title", dateformat(date, "yyyy-MM-dd") AS Date, description AS Description, file_link AS File
FROM -"5_system"
WHERE contains(type, "presentation")
//WHERE contains(tags, "#abmi/PIWO")
SORT date DESC
```