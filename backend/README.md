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

## Configuration (.env)

The backend reads its settings from `.env` in this folder when it starts (`src/config.py`). `.env` is ignored by git. There is one sample per AnnoQ dataset:

| Sample | AnnoQ API | Genome build | `ANNOQ_RSID_FIELD` | `ANNOQ_SITE_URL` | `PORT` |
| --- | --- | --- | --- | --- | --- |
| `.env.hrc` | `https://api-v2.annoq.org` | GRCh37/hg19 | `rs_dbSNP151` | `https://annoq.org` | 8002 |
| `.env.topmed` | `https://api-v2.topmed.annoq.org` | GRCh38/hg38 | `rs_dbSNP` | `https://topmed.annoq.org` | 8003 |

Copy the one for the dataset this deployment serves, then modify it as necessary:

```bash
cp .env.hrc .env      # or: cp .env.topmed .env
```

If you already have a `.env`, back it up first (`cp .env .env.bak`) and carry your Google Analytics values over.

| Setting | What to set |
| --- | --- |
| `ANNOTATION_API_V2` | AnnoQ's GraphQL endpoint. For a local api-v2, use `http://localhost:<SITE_PORT>/graphql`. |
| `ANNOTATION_DOWNLOAD_V2` | AnnoQ's download base, on the same API host as `ANNOTATION_API_V2`. |
| `ANNOQ_RSID_FIELD` | AnnoQ's rsID field for that dataset: `rs_dbSNP151` on HRC, `rs_dbSNP` on TOPMed. It must match `ANNOTATION_API_V2`. With the wrong one there is no error: AnnoQ still finds the SNPs but returns no rsIDs, so rsID inputs map to no genes. Required. |
| `ANNOQ_SITE_URL` | The AnnoQ site for that dataset, without a trailing path. SNPWay reads the AnnoQ release version (e.g. 1.3.11) from its `/version.json` and links the home page to it. Required. |
| `GA_MEASUREMENT_ID`, `GA_API_SECRET` | Google Analytics measurement ID and Measurement Protocol API secret for this deployment. |
| `PORT` | Port for `python main.py`; 8002 when unset. The samples use different ports so an HRC and a TOPMed SNPWay can run side by side. |

The rsID field is the only difference SNPWay sees between the datasets: both have every gene field it maps through (`src/gene_cols.py`). To find the field for another dataset, look for the `rs_` entry in the API's `/annotations`.

Restart the backend after changing `.env`.

### Version information

The genome build, dbSNP release, and WGSA version of the AnnoQ data are not set here. The backend reads them from AnnoQ's `/version`, beside `ANNOTATION_API_V2`, and serves them at `GET /annoq/version`; the home page shows the genome build from there. They are configured in the api-v2 deployment's `.env` (copied from `.env.hrc` or `.env.topmed`; see the annoq-api-v2 README). If AnnoQ does not report them, `/annoq/version` returns 502 and the home page leaves the genome build out.

The AnnoQ release version is not set here either. The same endpoint adds it as `annoq_version` (and `annoq_release_date`), read from `{ANNOQ_SITE_URL}/version.json`, which annoq-site-v2 publishes; the home page shows it as "Powered by AnnoQ version 1.3.11". A site without `/version.json` leaves these null and the home page leaves the version number out, while the data versions above are still served. `annoq_site_url` is returned too, so the home page links to the AnnoQ site for this dataset.

## Running the API

To run the API, use the following command:

```bash
python main.py
```

It listens on `PORT` from `.env` (see `.env.hrc` and `.env.topmed`), or 8002 when `PORT` is not set. To choose the port on the command line instead, run uvicorn directly; `--port` overrides `PORT`:

```bash
uvicorn main:app --port 8002 --reload
```

## Running the tests

Install the development dependencies and run pytest from the `backend` folder. The tests do not call AnnoQ or PANTHER.

```bash
pip install -r requirements-dev.txt
pytest
```
