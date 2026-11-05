# AGENTS.md

Notes for people and coding agents using or changing SNPWay. Each statement is
checked against the code in this repository, or against observed AnnoQ API
behavior where stated; file references say where.

## What SNPWay is

SNPWay maps a list of human variants to genes through AnnoQ's precomputed
annotations (ANNOVAR, SnpEff, VEP and PEREGRINE enhancer-gene links), then runs a
PANTHER overrepresentation test on the resulting gene list. It is available as a
web UI (`frontend/`, served by the backend at `/`), as a REST API
(`backend/main.py`), and from R through the AnnoQR package
(`snpwayGeneMappingsQuery`, `snpwayOverrepresentationWorkflowQuery`; default base
URL `http://snpway.annoq.org`).

Citation: [SNPWay citation to be added on publication].

## Endpoints

All three are `POST` with a JSON body. Request and response models are in
`backend/src/models.py`.

| Route | Request model | Response |
|---|---|---|
| `/workflow/gene_mappings` | `WorkflowInputRequest` | `WorkflowGeneMappingsResponse` |
| `/workflow/overrepresentation` | `WorkflowOverrepresentationRequest` | `WorkflowOverrepresentationResponse` |
| `/workflow/overrepresentation/stream` | `WorkflowOverrepresentationRequest` | NDJSON event stream |

**Request fields.** `input_type` is `rsId`, `rsIdList` or `ids`, with the
matching payload (`rsIdQuery {rsId}`, `rsIdListQuery {rsIdList}`,
`idsQuery {ids}`). `gene` and `keyword` are in the enum, but their AnnoQ queries
are not implemented (`create_gene_query` and `create_keyword_query` return
nothing). `geneMappingFields` selects the sources and defaults to all seven.
Overrepresentation requests add `annotDataSet` (required), `correction`
(default `FDR`), `enrichmentTestType` (default `FISHER`) and an optional
`referenceList`.

**WorkflowGeneMappingsResponse:**
- `gene_list`: unique identifiers sent to PANTHER.
- `rsId_genes_map`: variant key (the rsID, or `chrN:pos` for `ids`) to genes.
- `rsId_gene_sources`: variant key, gene, and the AnnoQ columns that assigned it.
- `panther_gene_info`, `gene_panther_mapping`: PANTHER gene details.
- `input_report`: `summary` (`n_*` counts), `variants` (one row per unique
  submitted variant: `input`, `variant_key`, `status`, `n_genes`), and
  `gene_identifiers` (`null` here). There is no `run_versions` on this endpoint.

**WorkflowOverrepresentationResponse** adds:
- `overrepresentation_results`: `termId`, `process`, `refCount`, `uploadCount`,
  `expected`, `foldEnrichment`, `overUnder`, `pValue`, `fdr`, `mapped_ids`.
  PANTHER's `UNCLASSIFIED` row is included.
- `reference_gene_list` (`null` with PANTHER's default reference) and
  `input_report.gene_identifiers` (`identifier`, `mapped_by_panther`,
  `panther_listed_as`, `panther_match`).
- `run_versions`: `snpway_version`, `annoq_version`, `genome_build`,
  `annoq_panel`, `dbsnp_release`, `annotator_versions` (only the tools behind
  the run's sources, including a SNP reference list's; keys `ANNOVAR`,
  `SnpEff`, `VEP`, `PEREGRINE`), `panther_version`, `panther_tool_release`.
  `annoq_version` is the AnnoQ release from the AnnoQ site's `/version.json`
  (`ANNOQ_SITE_URL` in `backend/.env`; `null` where the site does not publish
  it, as topmed.annoq.org does not yet). `genome_build`, `annoq_panel` and
  `dbsnp_release` come from AnnoQ's `/version`, and the tool versions from
  AnnoQ's `/annotations` metadata. All are read from AnnoQ at the start of
  each run, alongside the variant mapping, and are `null` when AnnoQ could not
  report them. The `panther_*` values are `null` when no test ran.

**Stream events** (one JSON object per line; see the handler's docstring):
`stage` (`input`, `reference`, `overrepresentation`, `gene_details`), `result`
(full response, gene details empty until the next event), `gene_details`,
`error` (HTTP status and `detail`), and `heartbeat` (every 15 s when idle). The
web UI uses the stream endpoint; AnnoQR uses the other two.

**Errors.** These return 422: validation errors, PANTHER rejecting the gene
lists, a list over the gene cap, and a reference list with no genes. Other
failures return 500; when an AnnoQ batch failed, `detail` names it.

## Input rules

- **Build:** the build of the AnnoQ data SNPWay queries, as reported by AnnoQ's
  `/version` (`GET /annoq/version`); GRCh37/hg19 for HRC (annoq.org). There is
  no liftover.
- **rsIDs:** separated by commas, spaces or newlines, and deduplicated in input
  order. They are matched to AnnoQ's rsID field, set by `ANNOQ_RSID_FIELD` in
  `backend/.env` (`rs_dbSNP151`, dbSNP build 151, for HRC).
- **VCF:**
  - Only CHROM and POS, the first two columns, are read, positionally.
  - `#` lines are skipped and a leading `chr` is stripped. Rows without a
    CHROM or a numeric POS are counted as invalid.
  - REF and ALT are ignored: each `chr:pos` is expanded to its 12 possible
    single-base substitutions (`_expand_ids_for_annoq`), so any SNV that AnnoQ
    holds at that position matches. `ids` that carry an allele (`1:100A>C`) are
    sent as they are.
- **Panel scope:** AnnoQ's panel, release `HRC.r1-1` (from AnnoQ's `/version`),
  covers chromosomes 1-22 and X. AnnoQ's API accepts only `'1'`-`'22'` and `'X'`
  and answers chromosome Y with HTTP 422 (observed on its `/count/chr` endpoint).
  The bundled reference sample (`frontend/public/samples/reference_sample_100K.vcf`),
  drawn equally from chromosomes 1-22 and X of the HRC r1.1 sites file, agrees.
  Position lookups can only match SNVs. Variants AnnoQ does not hold get `no_record`.
- **Intended inputs:** predefined lists (lead SNPs, curated panels, credible
  sets). For GWAS-derived inputs, use LD-pruned or otherwise independent
  variants, because correlated variants can give one locus disproportionate
  weight. This is the note above the Run test button
  (`frontend/src/components/TestInputs.tsx`).
- **No variant-count limit:** large lists are batched automatically.
- **Gene cap:** at most 100,000 unique genes per list (`MAX_PANTHER_GENE_COUNT`).
  The backend returns 422 above it, and the web UI checks it too.

## Source selection

The seven sources (`GeneMappingField`, `backend/src/gene_cols.py`):

| Value | Tool, gene model |
|---|---|
| `ANNOVAR_ensembl_Gene_ID` / `ANNOVAR_refseq_Gene_ID` | ANNOVAR, Ensembl / RefSeq |
| `SnpEff_ensembl_Gene_ID` / `SnpEff_refseq_Gene_ID` | SnpEff, Ensembl / RefSeq |
| `VEP_ensembl_Gene_ID` / `VEP_refseq_Gene_Name` | VEP, Ensembl / RefSeq |
| `enhancer_linked_genes` | PEREGRINE enhancer-gene links |

- **Closest-gene fallback:** selecting an ANNOVAR gene model also reads its
  `ANNOVAR_*_Closest_gene` column, the two genes flanking an intergenic variant.
  These are used only when that model's genic column gives the variant no gene
  (`FALLBACK_FOR`). They are labelled `ANNOVAR-Ensembl-closest` and
  `ANNOVAR-RefSeq-closest`.
- **Default:** the union of all seven, used when `geneMappingFields` is
  omitted. Each gene is counted once.
- **Subsets:** list the wanted values in `geneMappingFields` (at least one;
  duplicates are dropped). A custom reference list has its own
  `geneMappingFields`, which the web UI defaults to the input's selection.
  AnnoQR sends none, so it always uses the union.

## Analysis options

- **Tests:** `FISHER` (default) or `BINOMIAL`.
- **Corrections:** `FDR` (default), `BONFERRONI` or `NONE`.
  - With `NONE`, p-values are uncorrected, so some categories with p < 0.05 are
    expected by chance. The results page warns about this, and downloads write
    `NONE - p-values are uncorrected for multiple testing`.
  - The UI calls a category significant at FDR < 0.05 under `FDR`, and at
    p < 0.05 otherwise. `UNCLASSIFIED` never counts.
- **Datasets** (`frontend/src/constants.ts`): GO complete BP `GO:0008150` (UI
  default), MF `GO:0003674` and CC `GO:0005575`; `ANNOT_TYPE_ID_PANTHER_PATHWAY`;
  `ANNOT_TYPE_ID_PANTHER_GO_SLIM_MF`, `_BP`, `_CC`; `ANNOT_TYPE_ID_PANTHER_PC`;
  `ANNOT_TYPE_ID_REACTOME_PATHWAY`.
- **Background:** all human genes by default. A `referenceList` can be:
  - `rsIdList` or `ids`: SNPs, mapped like the input;
  - `geneList` with `geneListQuery {genes}`: identifiers sent to PANTHER as
    they are. In the UI, a gene list file has one entry per line; only the
    first tab-separated column is read, and `#` lines are skipped.

## Output conventions

Web UI downloads start with `# key,value` lines (`runStampLines`,
`frontend/src/components/utils.ts`), in this order:

```
# snpway_version,1.1.0
# annoq_version,1.3.11
# genome_build,GRCh37/hg19
# annoq_panel,HRC.r1-1
# dbsnp_release,151
# annovar_version,...        (conditional)
# snpeff_version,...         (conditional)
# vep_version,...            (conditional)
# peregrine_version,...      (conditional)
# panther_version,...
# panther_tool_release,...
# gene_mapping_sources,...   (AnnoQ columns used, ";"-separated, closest-gene columns included)
# test,FISHER
# correction,FDR
# run_date,YYYY-MM-DD
# annotation_dataset,...
```

- **Conditional lines:** a tool line appears only when the run used that tool.
  The union writes all four; ANNOVAR alone writes `annovar_version`;
  enhancer-only writes `peregrine_version`.
- **Unknown values** (including when AnnoQ's metadata could not be read) are
  written as `unknown`. `snpway_version` is set in `backend/src/version.py`.

| Download | File (`_<run_date>.csv` appended) | Rows |
|---|---|---|
| All Mappings | `gene_mapping_results` | one per variant and PANTHER gene |
| Only Significant Mappings | `significant_gene_mappings` | significant categories only |
| Per category (click the count) | `<category>_gene_mappings` | one category |
| Input Variant Report | `input_variant_report` | one per submitted variant |
| Gene Identifier Report | `gene_identifier_report` | one per identifier sent to PANTHER |

- **Mapping downloads:** columns `rsId` (`chr:pos` for VCF input),
  `PANTHER_ID`, `mappedGenes`, `sources`, `status` and the selected dataset's
  annotation column. "Include all gene information columns" writes all of them.
- **The two report files** also carry the `input_report.summary` counts as `#` lines.
- **Input Variant Report:** columns `rsId` or `chr:pos`, `variant_key`,
  `status`, `n_genes`. `status` is `annotated`, `no_record` (AnnoQ returned no
  record) or `no_gene` (a record, but no gene from the selected sources).
  - For VCF input there is one row per VCF data line, with `vcf_line`, CHROM,
    POS, ID, REF and ALT added, plus `# n_vcf_data_lines`,
    `# n_vcf_lines_invalid`, and two more statuses: `invalid` (skipped at parse
    time) and `not_in_report`, the join's fallback for a valid line whose
    `chr:pos` has no row in the backend's report. Because the backend reports
    every unique ID the frontend submits, it should not normally occur. The
    report can be downloaded even when no genes were found.
- **Gene Identifier Report:** columns `identifier`, `mapped_by_panther` (`yes`,
  `no`, `not_listed`), `panther_listed_as`, `panther_match` (`exact`,
  `version_suffix_removed` for a match without the `.N` suffix, `not_listed`),
  `sources`.

**Skipping the header block:**
- pandas: `pd.read_csv(path, comment="#")`
- R: `read.csv(path, comment.char = "#")`

Both also cut a line at any `#` inside a value. If a field may contain `#`,
count the leading `#` lines and pass that count as `skiprows` (pandas) or
`skip` (R) instead.

## Operational notes

- **Batching** is automatic and sequential: 5,000 rsIDs or 50,000 expanded
  position IDs (about 4,166 positions) per AnnoQ request, and 5,000 genes per
  PANTHER gene-details request. The test itself is one PANTHER request.
- **Runtime** depends on AnnoQ and PANTHER (timeouts: 300 s per AnnoQ request,
  180 s for the test, 60 s per gene-details batch). For large inputs, run one
  analysis at a time with no parallel requests to the public services, and be
  patient; the stream endpoint reports per-batch progress. A failed AnnoQ batch
  stops the run, and the error names that batch.
- **AnnoQ versions** (the version stamp) are read from AnnoQ on every
  overrepresentation run, so a new AnnoQ release is stamped without restarting
  the backend. A failed read does not stop the run; those versions are written
  as `unknown`. Annotation data is also queried live on every run.

## Known gaps

- AnnoQR's chromosome-range mode (`chromosome_identifier`, `start_position`,
  `end_position`) sends `input_type: "chromosome"`. The backend's `InputType`
  has no such value, so these requests fail validation.
- `frontend/package.json` still has the scaffold version `0.0.0`.
