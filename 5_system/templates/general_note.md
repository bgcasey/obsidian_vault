---
title: "<% tp.file.title
  .replace(/^\d{4}_\d{2}_\d{2}_/, '')    // strip leading YYYY_MM_DD_
  .replace(/_/g, ' ')                     // underscores -> spaces
  .toLowerCase()
  .replace(/\b\w/g, c => c.toUpperCase()) // Title Case
%>"
date: <% tp.file.creation_date('YYYY-MM-DD') %>
type: general
tags:
  - ""
description: ""
---
