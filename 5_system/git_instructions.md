---
title: git_instructions
date: 2024-07-23
type: general
tags: " #code/shell #code/git "
description: Code for backing up this folder to github.
---

```zsh
cd /Users/brendan/Dropbox/0_obsidian
git init 
git remote add origin https://github.com/bgcasey/obsidian_vault.git
git add . 
git status
git commit -m "Initial commit" 
git push -u origin main
git pull origin main
```

see [[git_terminal_command_cheat_sheet|Git Terminal Command Cheat Sheet]] for more commands.

