# Overview

This is a project that provides an application to run an overrepresentation analysis on a list of genes given a list of SNPs.

The API utilizes [AnnoQ](http://annoq.org/) to get a list of genes from a list of SNPs. The list of genes is then used to run an overrepresentation analysis using [PantherDB](https://pantherdb.org/)

The same workflow can be run from R with the [AnnoQR](https://github.com/USCbiostats/AnnoQR) package: `remotes::install_github("USCbiostats/AnnoQR")`.

## Installation

To install the project, clone the repository.

1. CD into the backend directory.

    ```bash
    cd backend
    ```

2. Create a virtual environment.

    ```bash
    python3 -m venv venv
    ```

3. Activate the virtual environment.

    ```bash
    source venv/bin/activate
    ```

4. Install the dependencies.

    ```bash
    pip install -r requirements.txt
    ```

## Building the Frontend

Before running the application, the frontend must be built and the files must be moved to the backend directory.

The frontend reads its settings from `frontend/.env` (copy `frontend/.env.example`). Leave `VITE_BACKEND_BASE_URL` empty for this build, because the backend serves the frontend and API from the same address. See [frontend/README.md](frontend/README.md) for running the frontend on its own against a backend on another port.

To do this, CD into the backend directory if you are not already there.

```bash
cd backend
```

Then run the following script.

```bash
chmod +x ./scripts/build_frontend.sh
./scripts/build_frontend.sh
```

## Running the API

First switch to the backend directory, if you are not already there.

```bash
cd backend
```

Activate the virtual environment.

```bash
source venv/bin/activate
```

To run the API and the built frontend, use the following command:

```bash
python main.py
```

The port comes from `PORT` in `backend/.env` (see `backend/.env.example`); it defaults to 8002 when unset. The API and the frontend are both served on this port.

During development you can instead run uvicorn directly, which reloads on code changes. Its `--port` option overrides `PORT`:

```bash
uvicorn main:app --port 8002 --reload
```

The VS Code debugger configuration in `.vscode/launch.json` also passes `--port 8002`. If you change the port and run the frontend on its own with `npm run dev`, update `VITE_BACKEND_BASE_URL` in `frontend/.env` to match.
