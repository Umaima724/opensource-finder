# ANSWERS.md

## 1. How to run

See README.md for full instructions. The one-liner summary:

```bash
cd backend && npm install && npm start &
cd ../frontend && npm install && npm start
```

Then open:

```text
http://localhost:3000
```

---

## 2. Stack choice

### Why Node.js + Express + React?

#### Node.js/Express
The GitHub API is REST/JSON, so a JavaScript backend consumes it with very little friction (`axios` / `fetch`). Express is lightweight, well-documented, and lets me build a working API quickly.

#### React
The UI is search-heavy and reactive:
- filters
- sorting
- loading states
- pagination

React’s component model and hooks (`useState`, `useEffect`) make this straightforward to manage cleanly.

Create React App also reduced setup overhead and allowed me to focus on functionality.

#### No database
The application is fully API-driven and stateless. Since the data already lives on GitHub, adding a database would increase complexity without much benefit for this task.

### What would have been a worse choice?

Django with vanilla HTML templates would have been a worse fit.

Why?
- Django’s ORM/database tooling would be unnecessary
- Server-rendered pages would feel clunky for real-time filtering
- Dynamic UI updates are significantly cleaner in React

This project benefits more from a lightweight API backend and reactive frontend.

---

## 3. One real edge case

### File
`backend/server.js`

### Lines
`150–165`

### What it handles
The application handles a slow or unresponsive GitHub API using an `AbortController` timeout.

If the GitHub API takes longer than 10 seconds to respond, the request is automatically aborted.

### Without this handling
Without the timeout:
- the frontend loading spinner could continue indefinitely
- users would receive no feedback
- too many hanging requests could exhaust server resources under load

### What happens with the handling
The backend catches the timeout error and returns:

```json
{
  "error": "GitHub API is too slow or unreachable"
}
```

with HTTP status:

```text
504 Gateway Timeout
```

The frontend then displays a retry message to the user.

---

## 4. AI usage

| Tool | What I asked | What it gave me | What I changed |
|---|---|---|---|
| ChatGPT & Claude | "Build a full-stack GitHub API consumer for finding beginner-friendly repos with error handling" | Suggested architecture (React + Express), endpoint structure, and project organization | I manually added `AbortController` timeout handling because the initial AI-generated version did not properly handle slow APIs. I also improved validation logic (such as `minStars > maxStars`) and added frontend warning states for slow responses. |

I used AI mainly for:
- scaffolding the project structure
- validating GitHub Search API syntax
- brainstorming feature ideas

The final implementation, error handling improvements, and UI refinements were manually adjusted afterward.

---

## 5. Honest gap

The pagination experience is still basic.

Currently the application only supports:
- Previous button
- Next button
- Current page counter

With another day, I would improve:
- infinite scrolling
- jump-to-page support
- skeleton loading placeholders
- debounced search inputs
- smoother mobile UX

### Planned improvements

#### Better pagination UX
Replace simple pagination with infinite scrolling using:

```text
IntersectionObserver
```

#### Better loading experience
Add skeleton loaders using:

```text
react-loading-skeleton
```

#### Reduced API spam
Debounce filter inputs so requests are not triggered on every keystroke.

These improvements would make the application feel more production-ready and responsive.

---