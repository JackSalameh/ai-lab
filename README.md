# AI Use-Case Tracker

A small, static web app for tracking AI use cases: what they are, who
owns them, and how many hours per week they save. It splits the total
into **realised** hours (use cases already "In production") versus
**expected** hours (ones still in "Pilot"), so savings you can already
count on stay separate from savings you're still hoping for.

## Features

- Add, edit, and delete use cases
- Reset to the starting sample data
- Export your data as JSON
- Totals: realised hours, expected hours, and an all-statuses total

## Known limitations

This is a static site with no backend or database. Each visitor's data
lives only in their own browser (localStorage) — there's no sync between
visitors or devices, and editing the seed data file only affects visitors
who haven't used the site before.

## Running locally

    npm run preview

Serves the site at http://localhost:8080.

## Running tests

    npm test

Runs the pure-logic test suite via Node's built-in test runner.

---

Built with [Claude Code](https://claude.com/claude-code) as a learning project.
