# Project Graveyard

Project Graveyard helps makers capture unfinished software projects, choose a way forward, and turn a restart into small tasks. The interface is a React and TypeScript application built with Vite. It stores everything in the current browser with LocalStorage.

## Run locally

```bash
npm install
npm run dev
```

Open the Local URL printed by Vite. For a production build, run `npm run build`; the static output is in `dist/` and can be hosted on any static site service.

## What works

- Dashboard with live metrics and a revival spotlight
- Project vault with search, filters, sorting, grid and list views
- Project creation, editing, deletion, archiving, restoring, and status changes
- Rule based resurrect, repurpose, and archive paths
- Roadmap generation, task creation, editing, completion, deletion, and ordering
- Timeline of actions recorded in the app
- Analytics based on current vault data
- Personal revival wall, theme selection, JSON export and validated import
- Four clearly marked demonstration projects on first launch

Data stays in the browser and does not sync across devices. Export a backup before clearing browser data. The assistant's suggestions are local rules and do not inspect source repositories.
