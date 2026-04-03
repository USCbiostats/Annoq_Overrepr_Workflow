# SNPWay Codebase Overview

## 1) What this repository is

SNPWay is a full-stack application that converts variant-oriented input (VCF-derived IDs, rsIDs, or chromosome ranges) into gene-level annotations and then runs overrepresentation testing using PANTHER.

At a high level, it does three things:

1. Accepts user input describing variants.
2. Queries AnnoQ to map variants to genes.
3. Runs PANTHER overrepresentation and presents/downloads results.

The repository contains:

- `backend/`: FastAPI service that queries AnnoQ, returns fast rsID-to-gene mappings, and exposes a separate endpoint for PANTHER gene metadata used in downloads.
- `frontend/`: React + MUI app that captures user input, calls backend for mappings, calls PANTHER overrepresentation directly, and lazily fetches download metadata from backend.


## 2) System architecture

### Runtime components

- Frontend: Browser SPA built with Vite + React.
- Backend: FastAPI application.
- External services:
  - AnnoQ GraphQL API: variant -> annotation table.
  - PANTHER geneinfo API: gene -> PANTHER metadata.
  - PANTHER enrich API: gene list -> overrepresentation results.

### Request/data flow

1. User selects input mode in frontend and submits analysis.
2. Frontend builds a request payload and POSTs to backend `/gene_mappings`.
3. Backend builds the AnnoQ GraphQL download query based on input type and fetches TSV data.
4. Backend extracts rsID -> gene mappings, aggregates unique genes, and enforces a 100,000 unique-gene cap.
5. Backend returns a slim `GeneMappingsResponse` (gene list + rsID-to-gene map).
6. Frontend validates gene count and calls PANTHER overrepresentation endpoint with `gene_list` when within limit.
7. Frontend renders, filters, and sorts significant terms.
8. When download is requested, frontend POSTs `gene_list` to backend `/panther_gene_info`.
9. Backend fetches PANTHER geneinfo in sequential batches of 1000 genes, merges results, and returns download metadata.


## 3) Repository map and ownership

## Backend

- `backend/main.py`: FastAPI app entrypoint, API routes (`/gene_mappings`, `/panther_gene_info`), static hosting.
- `backend/src/query.py`: Query models and AnnoQ query builders.
- `backend/src/annoq.py`: AnnoQ API interaction + rsID/gene extraction pipeline.
- `backend/src/gene_cols.py`: Declares which AnnoQ columns are used for gene extraction.
- `backend/src/gene_extractors.py`: Parsing logic for RefSeq/Ensembl/delimited gene fields.
- `backend/src/panther.py`: PANTHER geneinfo integration + response normalization.
- `backend/src/models.py`: Pydantic request/response schemas for mapping and lazy PANTHER metadata.
- `backend/scripts/build_frontend.sh`: Builds frontend and copies `dist/` into backend for static serving.

## Frontend

- `frontend/src/App.tsx`: Route definitions and theme wiring.
- `frontend/src/pages/Home.tsx`: End-to-end UX orchestration.
- `frontend/src/components/TestInputs.tsx`: Input collection/parsing and payload construction.
- `frontend/src/apis.ts`: Backend + PANTHER API calls, shared JSON/error parsing, and gene-limit constant.
- `frontend/src/components/ResultDisplay.tsx`: Overrepresentation table rendering, filtering, sorting, and lazy download preparation UX.
- `frontend/src/components/utils.ts`: Converts merged mapping + PANTHER metadata payload into exportable table rows.
- `frontend/src/models.ts`: Frontend response typings aligned with backend.
- `frontend/src/constants.ts`: Input/test/correction enums and annotation dataset options.
- `frontend/src/theme/theme.ts`: MUI theme configuration.
- `frontend/src/components/BrandHeader.tsx`, `TopBar.tsx`, `Footer.tsx`: Shared layout.
- `frontend/src/pages/API.tsx`: API documentation page aligned with current endpoint contracts.
- `frontend/src/pages/About.tsx`, `Contact.tsx`, `NotFound.tsx`: informational pages.


## 4) Backend deep dive

## 4.1 API entrypoint (`backend/main.py`)

### FastAPI setup

- Creates app instance.
- Adds CORS middleware with `allow_origins=["*"]` and wildcard methods/headers.
- Defines `NoCacheStaticFiles` class to disable browser caching for served frontend assets.
- Mounts `dist/` at root `/`, so backend can serve SPA assets after build copy.

### Endpoint 1: `POST /gene_mappings` (fast mapping)

Inputs are modeled as:

- `input_type` (required enum).
- Optional typed payloads for each mode (`chrQuery`, `rsIdQuery`, `rsIdListQuery`, `idsQuery`, `geneQuery`, `keywordQuery`).

Execution path:

1. Chooses query object by `input_type`.
2. Calls `get_annoq_df(input_type, query)`.
3. Calls `get_rsid_gene_mapping(df)`.
4. Builds deduplicated `gene_list`.
5. Validates gene count (`<= 100000`).
6. Returns `GeneMappingsResponse` containing `gene_list` and `rsId_genes_map`.

### Endpoint 2: `POST /panther_gene_info` (lazy metadata for downloads)

Inputs are modeled as:

- `gene_list: list[str]`

Execution path:

1. Deduplicates and trims `gene_list`.
2. Validates gene count (`<= 100000`).
3. Calls `get_panther_info(gene_list)`.
4. Returns `PantherGeneInfoResponse` containing `panther_gene_info` and `gene_panther_mapping`.

Error handling now preserves explicit `HTTPException`s (e.g., 422 limit checks) and wraps unexpected failures as HTTP 500 with `detail=str(e)`.


## 4.2 Query models and supported input types (`backend/src/query.py`)

`InputType` enum:

- `chromosome`
- `gene`
- `rsId`
- `rsIdList`
- `ids`
- `keyword`

Pydantic query models:

- `ChromosomeQuery`: `chr`, `start`, `end`
- `RsIdQuery`: single `rsId`
- `RsIdListQuery`: list `rsIdList`
- `IdsQuery`: list `ids` (used for parsed VCF variant IDs)
- `GeneQuery`: `gene`
- `KeywordQuery`: `keyword`


## 4.3 AnnoQ integration and mapping pipeline (`backend/src/annoq.py`)

### Query creation

`create_gql_query` dispatches by `InputType` to specific builders.

Implemented builders:

- `create_chromosome_query`
- `create_rs_id_query`
- `create_rs_id_list_query`
- `create_ids_query`

Not implemented (currently `pass`):

- `create_gene_query`
- `create_keyword_query`

`generate_gql_download_query(function_name, filter_fields)` creates GraphQL:

- Adds selected output fields from `GENE_COLS + rs_dbSNP151`.
- Calls AnnoQ `download_*` function and requests downloadable TSV path.

### Download and parse

- `get_download_url` POSTs to `https://api-v2.annoq.org/graphql`.
- Extracts `data.download` and prefixes it with `https://api-v2.annoq.org/download`.
- `download_data` GETs TSV and loads into pandas DataFrame.
- Replaces `"."` placeholders with empty string globally in DataFrame.

### rsID -> genes extraction

`get_rsid_gene_mapping(annoq_df)`:

1. Iterates rows.
2. Uses `rs_dbSNP151` as rsID key.
3. For each configured column in `GENE_COLS`, applies its extractor.
4. Strips empties and deduplicates genes per rsID.

Output:

- `dict[str, list[str]]` mapping rsID to associated genes.


## 4.4 Gene column config (`backend/src/gene_cols.py`)

Configured fields and parser mapping:

- Ensembl-like columns -> regex extractor (`ENSG\d+`).
- RefSeq-like columns -> custom splitter/parser.
- `enhancer_linked_genes` -> semicolon split.

This file is effectively the central place that defines which AnnoQ columns contribute genes to downstream analysis.


## 4.5 Gene extractor behavior (`backend/src/gene_extractors.py`)

- `delimited_gene_extractor`: generic split by delimiter, trims empties.
- `extract_ensembl_gene_ids`: regex findall for ENSG IDs.
- `extract_refseq_gene_ids`: custom parsing that handles:
  - `CHR_START-` prefix.
  - composite separators (`|`, `,`, `:`).
  - special handling around hyphenated tokens and `AS\d+` suffixes.
  - removal of entries containing `NONE`.


## 4.6 PANTHER gene metadata integration (`backend/src/panther.py`)

`get_panther_info(gene_list)`:

- Splits inputs into sequential batches of 1000 genes (`PANTHER_GENEINFO_BATCH_SIZE = 1000`).
- POSTs each batch to `https://pantherdb.org/services/oai/pantherdb/geneinfo` with `geneInputList=<comma genes>`, `organism=9606`.
- Merges every batch response into:
  - `panther_gene_info: dict[PANTHER_ID, GeneInfo]`
  - `gene_panther_mapping: dict[gene_symbol, list[PANTHER_ID]]`

This batching was introduced to support the upstream PANTHER geneinfo API limit of 1000 IDs per request while preserving existing output structure.

`GeneInfo` is populated with family/subfamily and multiple annotation classes:

- PANTHER pathways
- Protein class
- Reactome pathway
- GO complete categories
- PANTHER GO slim categories

Helper extraction handles both object and list forms from API response.


## 4.7 Backend response schema (`backend/src/models.py`)

`GeneMappingsResponse` fields:

- `gene_list: list[str]`
- `rsId_genes_map: dict[str, list[str]]`

`PantherGeneInfoRequest` fields:

- `gene_list: list[str]`

`PantherGeneInfoResponse` fields:

- `panther_gene_info: dict[str, GeneInfo]`
- `gene_panther_mapping: dict[str, list[str]]`

Frontend models mirror this shape in TypeScript.


## 5) Frontend deep dive

## 5.1 Application shell and routing

- `main.tsx`: wraps app with `BrowserRouter` and React strict mode.
- `App.tsx`: route table:
  - `/` -> `Home`
  - `/about` -> `About`
  - `/contact` -> `Contact`
  - `*` -> `NotFound`
- `ThemeProvider` + `CssBaseline` from MUI.


## 5.2 Home page orchestration (`frontend/src/pages/Home.tsx`)

`Home` manages end-to-end analysis state:

- Loading, error, success flags.
- Current stage (`1` input form, `2` results view).
- Backend response (`GeneMappingResponse`).
- Overrepresentation response (raw object).
- Selected PANTHER settings (`dataset`, `correction`, `testType`).

Core method: `onRunTest(payload, dataset, testType, correction)`

1. Calls backend `getGeneMappings(payload)`.
2. Validates response and non-empty gene list.
3. Enforces frontend cap check (`gene_list.length <= 100000`) before overrepresentation.
4. Calls `getOverrepresentation(gene_list.join(","), ...)`.
5. Stores results and advances to stage 2.

Also includes `submitToPanther()` that builds an HTML form and opens full PANTHER results in a new tab.


## 5.3 Input capture and payload construction (`frontend/src/components/TestInputs.tsx`)

Supported UI input modes:

- `VCF`
- `CHROMOSOME`
- `RSIDS`

### Payload construction logic

- Chromosome mode -> backend payload:
  - `input_type: "chromosome"`
  - `chrQuery: { chr, start, end }`

- VCF mode:
  - Parses each non-header VCF line, splits columns, creates ID string:
    - `${chrom_without_chr}:${pos}${ref}>${alt}`
  - Sends:
    - `input_type: "ids"`
    - `idsQuery: { ids: [...] }`

- rsIDs mode:
  - Normalizes separators via `process_rsids`.
  - Sends:
    - `input_type: "rsIdList"`
    - `rsIdListQuery: { rsIdList: [...] }`

Advanced options are optional and configure:

- Test type (`FISHER`, `BINOMIAL`)
- Multiple-testing correction (`FDR`, `BONFERRONI`, `NONE`)
- Annotation dataset (GO/PANTHER/Reactome options from constants)


## 5.4 API layer (`frontend/src/apis.ts`)

- `getGeneMappings(payload)`:
  - POST to `${VITE_BACKEND_BASE_URL}/gene_mappings`.
  - Uses JSON body.

- `getPantherGeneInfo(geneList)`:
  - POST to `${VITE_BACKEND_BASE_URL}/panther_gene_info`.
  - Used only when download data is being prepared.

- `parseJsonResponse<T>(response)`:
  - Shared parser for JSON success/error handling across API calls.
  - Surfaces backend `detail` messages when available.

- `MAX_OVERREP_GENE_COUNT = 100000`:
  - Shared frontend constant used to guard overrepresentation submissions.

- `getOverrepresentation(...)`:
  - POST directly to PANTHER enrich endpoint.
  - Uses `application/x-www-form-urlencoded`.
  - Hardcodes `organism=9606` and `mappedInfo=COMP_LIST`.


## 5.5 Results rendering and export (`frontend/src/components/ResultDisplay.tsx`)

Responsibilities:

- Parse PANTHER overrep response into table rows.
- Apply significance filter:
  - `FDR`: `fdr < 0.05`
  - otherwise: `pValue < 0.05`
- Support sort-by-column (asc/desc).
- Toggle between significant-only and all results.
- Provide CSV downloads:
  - all mappings
  - significant-only mappings
  - per-term mappings by clicking row count in upload column.
- Lazily prepare download metadata from backend only when a download is triggered.

UI implementation details:

- Uses `react-virtuoso` for virtualized table rendering.
- Supports dynamic columns (adds FDR column when correction type is FDR).
- Shows a "Preparing your download..." state while backend fetches PANTHER metadata.
- Caches prepared PANTHER metadata for subsequent download actions.
- Uses `createResultsTableData` helper to map merged payloads into export rows.


## 5.6 Export mapping helper (`frontend/src/components/utils.ts`)

`createResultsTableData(geneMappingDownloadData, pantherIdsToInclude?, annotationDataset?)`

Algorithm:

1. Iterate each rsID and its genes.
2. Find PANTHER IDs per gene via `gene_panther_mapping`.
3. Build unique `(rsID, PANTHER_ID)` pairs.
4. Compute `mappedGenes` intersection for each pair.
5. Join with lazy-loaded `panther_gene_info` and return flattened rows.
6. Optionally filter to relevant columns based on selected dataset.

This module is the key bridge from nested backend graph data into analyst-friendly flat table format.


## 5.7 Theme and styling

- MUI custom theme in `frontend/src/theme/theme.ts`.
- Serif headings + sans-serif body.
- Conservative blue palette oriented to scientific/productivity UX.
- Base body styles in `frontend/src/index.css`.


## 6) API contracts (practical examples)

## 6.1 Backend request example (rsID list)

```json
{
  "input_type": "rsIdList",
  "rsIdListQuery": {
    "rsIdList": ["rs1219648", "rs2912774", "rs2981582"]
  }
}
```

## 6.2 Backend response shape (`POST /gene_mappings`)

```json
{
  "gene_list": ["FGFR2", "..."],
  "rsId_genes_map": {
    "rs1219648": ["FGFR2", "..."]
  }
}
```

## 6.3 Lazy download metadata endpoint (`POST /panther_gene_info`)

Request:

```json
{
  "gene_list": ["FGFR2", "BRCA1", "TP53"]
}
```

Response:

```json
{
  "panther_gene_info": {
    "PTHR12345:SF1": {
      "PANTHER_ID": "PTHR12345:SF1",
      "PANTHER_family": "...",
      "PANTHER_Subfamily": "...",
      "PANTHER_Pathway": "...",
      "Protein_Class": "...",
      "Reactome_Pathway": "...",
      "GO_database_MF_complete": "...",
      "GO_database_BP_complete": "...",
      "GO_database_CC_complete": "...",
      "PANTHER_GO_slim_Molecular_Function": "...",
      "PANTHER_GO_slim_Biological_Process": "...",
      "PANTHER_GO_slim_Cellular_Component": "..."
    }
  },
  "gene_panther_mapping": {
    "FGFR2": ["PTHR12345:SF1"]
  }
}
```

## 6.4 Limit validation error example

```json
{
  "detail": "Input exceeds PANTHER limit of 100,000 unique genes. Found 123456 unique genes."
}
```


## 7) Build, run, and deployment model

## Local development

Backend:

1. `cd backend`
2. Create/activate venv.
3. `pip install -r requirements.txt`
4. `uvicorn main:app --port 8002 --reload`

Frontend standalone dev:

1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Set `VITE_BACKEND_BASE_URL` to backend host.

Integrated static serving via backend:

1. `cd backend`
2. `./scripts/build_frontend.sh`
3. Run backend.
4. FastAPI serves copied `dist/` from `/`.


## 8) Known constraints and technical debt

1. `gene` and `keyword` input modes are declared but backend query builders are not implemented.
2. Network calls have minimal resilience (no retries/backoff, broad exception wrapping).
3. `httpx.AsyncClient(verify=False)` is used for AnnoQ requests in backend.
4. CORS is globally open (`*`).
5. Frontend overrepresentation call bypasses backend and depends on browser-to-PANTHER connectivity/CORS.
6. Some frontend types are `any` (e.g., overrepresentation payload), reducing compile-time safety.
7. In `TestInputs`, file-reader helper sets `rsIds` even while reading VCF input (likely harmless but confusing state coupling).
8. In `ResultDisplay`, correction label logic displays Bonferroni vs FDR text; `NONE` falls into non-Bonferroni branch and uses raw p-value filter path.
9. Lazy download preparation can be slow on large gene lists because PANTHER metadata is fetched on-demand.
10. Static build copy script duplicates `dist` into backend without cleanup/versioning strategy.


## 9) What to know before modifying the system

1. The main backend extension points are `backend/src/query.py`, `backend/src/annoq.py`, and endpoint orchestration in `backend/main.py`.
2. `/gene_mappings` is intentionally lightweight; download-related metadata lives behind `/panther_gene_info`.
3. CSV output schema changes should be made in one place: `frontend/src/components/utils.ts`.
4. If annotation columns in AnnoQ evolve, update `backend/src/gene_cols.py` and ensure extractors still parse correctly.
5. Any backend API shape change must be mirrored in `frontend/src/models.ts` and `frontend/src/apis.ts`.


## 10) Recommended onboarding path for new engineers

1. Run backend only and inspect `/gene_mappings` and `/panther_gene_info` with small payloads.
2. Run frontend in dev mode and follow one full analysis from input to result table and CSV download.
3. Read these files in order:
   - `backend/main.py`
   - `backend/src/annoq.py`
   - `backend/src/panther.py`
   - `frontend/src/pages/Home.tsx`
   - `frontend/src/components/TestInputs.tsx`
   - `frontend/src/components/ResultDisplay.tsx`
   - `frontend/src/components/utils.ts`
   - `frontend/src/apis.ts`
4. Add one small feature end-to-end (for example, a new dataset option or extra CSV column) to validate your understanding.


## 11) Summary

This codebase is a practical integration layer between variant annotations (AnnoQ) and functional enrichment (PANTHER), now optimized for responsiveness by separating fast mapping from slower download metadata enrichment. The backend focuses on mapping normalization and bounded metadata retrieval, while the frontend orchestrates enrichment, limit-aware UX, and on-demand export preparation.
