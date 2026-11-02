# Overview

This is a FastAPI project that provides an API to run an overrepresentation analysis on a list of genes.

The API utilizes [AnnoQ](http://annoq.org/) to get a list of genes from a list of SNPs. The list of genes is then used to run an overrepresentation analysis using [PantherDB](https://pantherdb.org/).

## Installation

To install the project, clone the repository.

Create a virtual environment and activate it using the following commands:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the dependencies using the following command:

```bash
pip install -r requirements.txt
```

## Running the API

To run the API, use the following command:

```bash
python main.py
```

It listens on `PORT` from `.env` (see `.env.example`), or 8002 when `PORT` is not set. To choose the port on the command line instead, run uvicorn directly; `--port` overrides `PORT`:

```bash
uvicorn main:app --port 8002 --reload
```

## Running the tests

Install the development dependencies and run pytest from the `backend` folder. The tests do not call AnnoQ or PANTHER.

```bash
pip install -r requirements-dev.txt
pytest
```
