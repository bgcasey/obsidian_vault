---
title:  <% tp.file.title.replace(/^\d{4}_\d{2}_\d{2}_/, '') // Remove date if it exists in the format YYYY_MM_DD_
                   .replace(/_/g, ' ') // Replace underscores with spaces
                   .toLowerCase() // Convert to lowercase first
                   .replace(/\b\w/g, char => char.toUpperCase()) %>
date: <% tp.file.creation_date("YYYY-MM-DD") %>
type: training
tags: " #fitness/training #fitness #fitness/training/rowing  "
description: "Training note template for rowing workouts. "
---

