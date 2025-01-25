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
uvicorn main:app
```
