# Task Manager

A small task management application built for the Artefact Software Engineer assessment. It supports creating, viewing, editing, and deleting tasks with an intentionally simple architecture.

## Stack

Next.js 15 App Router, React 19, TypeScript (strict mode), Tailwind CSS 4, tRPC 11, Zod 4, and Radix Dialog. The application uses npm and runs as one Node.js process.

## Features

- Server-rendered task list with titles, optional descriptions, and creation dates.
- Reusable create and edit form with validation and pending, success, and error feedback.
- Edit and delete dialogs with keyboard and focus handling.
- Responsive interface with an empty state and visible loading feedback.

## Architecture

`src/app` contains the page and tRPC HTTP route. `src/features/tasks` contains the task model, shared Zod schemas, form, and interactive task list. `src/trpc` contains the router, typed browser client, and server caller. `src/server/tasks` contains the in-memory repository and its process-wide instance.

The main page is a Server Component with `dynamic = "force-dynamic"` and the Node.js runtime. It calls `tasks.list` through the server-side tRPC caller, so the initial HTML contains the current tasks without browser JavaScript. This avoids a second HTTP request on the server. The browser uses the typed tRPC HTTP client for mutations, then calls `router.refresh()` to receive a new server-rendered list. No separate client-side task collection competes with the server state.

All create, update, and delete input is checked by Zod in the tRPC procedures. The form uses the same create schema for immediate validation. The procedures delegate storage and business rules to a small repository. Standard tRPC errors report invalid input or missing tasks. Radix Dialog provides accessible dialog behavior without a custom modal implementation.

## Run locally

Use Node.js 20 or newer and npm. From the project root:

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

For a production build:

```bash
npm run build
npm run start
```

Run `next dev` and `next start` separately: both use the same `.next` directory.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:integration
```

`npm test` runs isolated repository and tRPC procedure tests. `npm run test:integration` requires a completed production build. It starts a temporary production server on a free local port, performs CRUD through tRPC HTTP, and checks that the task content appears or disappears in the page's rendered HTML. Stop any development or production server using this project's `.next` directory before running the integration check. There is no permanent browser automation suite.

## Limitations and possible improvements

Tasks live in memory and are lost when the server process restarts. The repository is shared only inside one Node.js process; multiple processes or serverless instances cannot guarantee a consistent task list. Authentication is outside this assessment's scope. Durable storage and authentication would be sensible next steps for a deployed application. Infinite scroll was intentionally omitted because it is optional and adds little value to a small task list.
