---
title: "<% tp.user.extractBibTeXField(tp, 'title') %>"
author: <% tp.user.extractBibTeXField(tp, 'author', { firstOnly: true }) %>
year: <% tp.user.extractBibTeXField(tp, 'year') %>
citation_key: <% tp.user.extractBibTeXKey(tp) %>
doi: "https://doi.org/<% tp.user.extractBibTeXField(tp, 'doi') %>"
type: literature
tags: " "
description: " "
zotero_link: " "
file_link: " <% tp.user.extractBibTeXField(tp, 'file', { useIcon: true }) %> "
---

# <% tp.user.extractBibTeXField(tp, 'title') %>

<% tp.user.extractBibTeXField(tp, 'author') %>

<% tp.user.extractBibTeXField(tp, 'year') %>

<% tp.user.extractBibTeXField(tp, 'file') %>

---

<%* tp.file.rename(tp.user.extractBibTeXField(tp, 'author', { firstLastOnly: true })+"_"+tp.user.extractBibTeXField(tp, 'year')); %>

