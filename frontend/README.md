# Overview

This is a React app that uses the backend API present in the same repository. This app allows users to run the overrepresentation analysis on the genes given a list of SNP IDs. The user can also view the results of the analysis in a tabular format.

# Installation

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Copy `.env.example` to `.env` and adjust the values (see [Configuration](#configuration))

# Configuration

Settings are read from `.env` by Vite and built into the app, so rebuild after changing them.

| Variable | Purpose |
| --- | --- |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement ID. |
| `VITE_BACKEND_BASE_URL` | Base URL of the backend API, without a trailing slash, e.g. `http://localhost:8002`. Leave empty when the backend serves the built frontend; requests then go to the address the page was loaded from. |

# Running the app standalone for testing

1. Run the backend API (see the main README; it uses `PORT` from `backend/.env`, 8002 by default)
2. Set `VITE_BACKEND_BASE_URL` in `.env` to the backend address on that port, e.g. `VITE_BACKEND_BASE_URL=http://localhost:8002`
3. Run `npm run dev` to start the app (Vite serves it on http://localhost:5173 by default)

Before building the frontend for the backend to serve (`backend/scripts/build_frontend.sh`), set `VITE_BACKEND_BASE_URL` back to empty, otherwise the built app keeps calling the address used for testing.
