# SNPWay Codebase Overview

## 1. What this repository is

SNPWay is a full-stack application that converts variant-oriented input, such as VCF-derived CHROM/POS positions, rsIDs, or chromosome ranges, into gene-level annotations and PANTHER overrepresentation results.

The repository contains:

- `backend/`: FastAPI service that runs the SNPWay workflow end-to-end and returns a compact workflow payload.
- `frontend/`: React + MUI app that captures user input, calls the workflow endpoints, and derives significance and CSV exports locally.

## 2. Runtime flow

1. The user chooses an input mode in the frontend and submits an analysis.
2. The frontend sends the request to `POST /workflow/gene_mappings` or `POST /workflow/overrepresentation`.
3. The backend maps SNP input to genes via AnnoQ and enforces the 100,000 unique-gene limit used by PANTHER.
4. The backend fetches PANTHER gene metadata and runs overrepresentation analysis.
5. The backend returns a compact response containing `gene_list`, `rsId_genes_map`, `panther_gene_info`, `gene_panther_mapping`, and `overrepresentation_results`.
6. The frontend, annoq-py, and AnnoQR derive significant rows and CSV tables locally from that compact response.

## 3. Main components

### Backend

- `backend/main.py`: FastAPI entrypoint with the two workflow routes and static frontend hosting.
- `backend/src/annoq.py`: AnnoQ integration and SNP-to-gene mapping helpers.
- `backend/src/panther.py`: PANTHER gene metadata integration.
- `backend/src/workflow.py`: PANTHER overrepresentation client and result normalization helpers.
- `backend/src/models.py`: Pydantic request and response models for the workflow routes.
- `backend/src/query.py`: Query models for chromosome, rsID, gene, keyword, and VCF-derived input.

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