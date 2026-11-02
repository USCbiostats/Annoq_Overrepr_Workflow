# SNPWay Codebase Overview

## 1. What this repository is

SNPWay is a full-stack application that converts variant-oriented input, such as VCF-derived CHROM/POS positions or rsIDs, into gene-level annotations and PANTHER overrepresentation results.

The repository contains:

- `backend/`: FastAPI service that runs the SNPWay workflow end-to-end and returns a compact workflow payload.
- `frontend/`: React + MUI app that captures user input, calls the workflow endpoints, and derives significance and CSV exports locally.

## 2. Runtime flow

1. The user chooses an input mode in the frontend and submits an analysis.
2. The frontend sends the request to `POST /workflow/overrepresentation/stream`. API clients use `POST /workflow/gene_mappings` or `POST /workflow/overrepresentation`.
3. The backend maps SNP input (and an optional custom reference SNP list, at the same time) to genes via AnnoQ in batches and enforces the 100,000 unique-gene limit used by PANTHER. A custom reference gene list is used as it is.
4. The backend runs the PANTHER overrepresentation test, then fetches PANTHER gene metadata, which is only needed for downloads.
5. The backend returns a compact response containing `gene_list`, `rsId_genes_map`, `panther_gene_info`, `gene_panther_mapping`, `overrepresentation_results` and `reference_gene_list`.
6. The frontend, annoq-py, and AnnoQR derive significant rows and CSV tables locally from that compact response.

### Streaming endpoint

`POST /workflow/overrepresentation/stream` takes the same body as `/workflow/overrepresentation` and returns newline-delimited JSON events:

- `stage`: progress for `input`, `reference`, `overrepresentation` and `gene_details`, with `status` (`pending`, `running`, `done`, `failed`) and batch counts `done`/`total` where available.
- `result`: the response as soon as the overrepresentation test finishes, with empty `panther_gene_info` and `gene_panther_mapping`. The frontend shows results at this point.
- `gene_details`: `panther_gene_info` and `gene_panther_mapping`. The frontend enables downloads when this arrives.
- `error`: `stage`, HTTP `status` and `detail`. Before `result` the run has stopped; after it, only downloads are affected.
- `heartbeat`: sent every 15 seconds while nothing else happens.

## 3. Main components

### Backend

- `backend/main.py`: FastAPI entrypoint with the workflow routes (including the streaming route) and static frontend hosting.
- `backend/src/annoq.py`: AnnoQ integration and SNP-to-gene mapping helpers.
- `backend/src/panther.py`: PANTHER gene metadata integration.
- `backend/src/workflow.py`: PANTHER overrepresentation client and result normalization helpers.
- `backend/src/models.py`: Pydantic request and response models for the workflow routes.
- `backend/src/query.py`: Query models for rsID, gene, keyword, and VCF-derived input.
- `backend/src/gene_cols.py`: Selectable AnnoQ gene columns (SNP-to-gene mapping tools) and their gene extractors.
- `backend/tests/`: pytest suite (`pip install -r requirements-dev.txt`, then `pytest` from `backend/`).

### Frontend

- `frontend/src/apis.ts`: Workflow API wrapper.
- `frontend/src/components/ResultDisplay.tsx`: Result table, significance filtering, and CSV download UI.
- `frontend/src/components/utils.ts`: Client-side CSV row builder used by the result view.
- `frontend/src/models.ts`: TypeScript shapes for the compact workflow response.
- `frontend/src/pages/API.tsx`: Library-focused usage page for annoq-py and AnnoQR.

## 4. Workflow response shape

The backend intentionally keeps the wire payload small. The workflow response contains only the data that cannot be derived cheaply on the client:

- `gene_list`
- `rsId_genes_map`
- `panther_gene_info`
- `gene_panther_mapping`
- `overrepresentation_results`
- `reference_gene_list` (only when a custom reference list was sent; otherwise `null`)

Optional request fields:

- `geneMappingFields`: AnnoQ gene columns used to map SNPs to genes (`ANNOVAR_ensembl_Gene_ID`, `ANNOVAR_refseq_Gene_ID`, `SnpEff_ensembl_Gene_ID`, `SnpEff_refseq_Gene_ID`, `VEP_ensembl_Gene_ID`, `VEP_refseq_Gene_Name`, `enhancer_linked_genes`). Defaults to all.
- `referenceList` (`/workflow/overrepresentation` and `/workflow/overrepresentation/stream`): a custom reference list with its own `input_type`:
  - `ids` or `rsIdList`: SNPs with their query payload and `geneMappingFields`, mapped to genes through AnnoQ.
  - `geneList`: gene IDs in `geneListQuery` (`{"genes": [...]}`), used as they are without AnnoQ; `geneMappingFields` is ignored. Blank entries and duplicates are dropped. Only allowed for the reference list, not the input list.

  The reference genes are sent to PANTHER as `refInputList` with `refOrganism=9606`. When `referenceList` is omitted, PANTHER uses all human genes.

The clients compute:

- significant overrepresentation rows
- CSV download rows for all mappings
- CSV download rows for significant mappings
- all-column CSV variants for export

## 5. Package integrations

### Python (`annoq-py`)

- `get_snpway_gene_mappings(...)` returns the compact mapping payload.
- `run_snpway_overrepresentation_workflow(...)` enriches the compact backend response locally with significance and CSV-ready convenience data.

### R (`AnnoQR`)

- `snpwayGeneMappingsQuery(...)` returns the compact mapping payload.
- `snpwayOverrepresentationWorkflowQuery(...)` enriches the compact backend response locally with significance and CSV-ready convenience data.

## 6. Notes

- The old `/gene_mappings` and `/panther_gene_info` compatibility routes have been removed.
- The frontend no longer depends on backend-generated CSV arrays or significant-result arrays.
- The site documentation should focus on the libraries, not on a separate public API surface.