---
title: <% tp.file.title.replace(/^\d{4}_\d{2}_\d{2}_/, '') // Remove date if it exists in the format YYYY_MM_DD_
                   .replace(/_/g, ' ') // Replace underscores with spaces
                   .toLowerCase() // Convert to lowercase first
                   .replace(/\b\w/g, char => char.toUpperCase()) %>
date: <% tp.file.title.match(/^\d{4}_\d{2}_\d{2}/)[0].replace(/_/g, '-') %>
type: presentation
tags: " #presentation  "
attendees:
- 
- 
description:
length:
wordcountgoal: 130 wpm
cssclass: heading-numbers
file_link: "[📄](file:///)"
---




# Title
Brendan Casey
Date

Good afternoon all. My name is Brendan Casey and I'll be talking about...

---
# Slide 1


---
# Slide 2


---
# Slide 3


---
# Slide 4