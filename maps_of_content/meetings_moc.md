---
title: meetings_moc
date: 2024-04-11
type: general
tags:
  - "#type/meetings"
description: Table view of meetings
---

```dataview
TABLE  date As Date, description As Description
From -"5_system" and -"4_archive" 
WHERE contains(type,"meeting")
SORT date DESC

```
