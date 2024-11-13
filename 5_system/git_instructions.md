---
title: git_instructions
date: 2024-07-23
type: general
tags: " #code/shell #github "
description: Code for backing up this folder to github.
---



```zsh
cd /Users/brendancasey/Dropbox/0_obsidian
git init 
git remote add origin https://github.com/bgcasey/obsidian_vault.git
git add . 
git commit -m "Initial commit" 
git status
git push -u origin main
git pull origin main
```