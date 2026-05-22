# Open Source Project Finder

A full-stack web application that helps beginners discover open-source repositories with beginner-friendly issues using the GitHub Search API.

---

# What It Does

- Search repositories by programming language
- Filter by star count (minimum / maximum)
- Filter by issue label (`good first issue`, `help wanted`, etc.)
- Sort by:
  - Stars
  - Last updated
  - Fork count
- One-click access to matching GitHub issues
- Gracefully handles:
  - Slow API responses
  - GitHub API errors
  - Invalid user input

---

# Tech Stack

## Frontend
- React (Create React App)

## Backend
- Node.js
- Express.js

## API
- GitHub REST API v3

## Database
- None (stateless API-driven application)

---

# Project Structure

```plain
opensource-finder/
├── backend/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── index.js
│   │   └── App.js
│   │
│   └── package.json
│
├── README.md
└── ANSWERS.md