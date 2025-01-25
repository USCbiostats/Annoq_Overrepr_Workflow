# Overview

This is a project that provides an application to run an overrepresentation analysis on a list of genes given a list of SNPs.

The API utilizes [AnnoQ](http://annoq.org/) to get a list of genes from a list of SNPs. The list of genes is then used to run an overrepresentation analysis using [PantherDB](https://pantherdb.org/)

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

To do this, CD into the backend directory if you are not already there.

```bash
cd backend
```

Then run the following script.

```bash
.scripts/build_frontend.sh
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

To run the API, use the following command:

```bash
uvicorn main:app
```
