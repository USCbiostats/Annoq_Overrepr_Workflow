# backend/data

## lexicon_symbols.txt

Gene-symbol lexicon used by `extract_refseq_gene_ids_fixed` (`src/gene_extractors.py`) to keep hyphenated gene names (HLA-C, LINC-PINT, TBX5-AS1) whole.

- Version: 2026-10-10 build.
- Source: HGNC complete set export `hgnc_complete_set.csv` (comma-delimited, 54 columns, 44,056 rows, all status Approved), sha256 `77ee22c9a4c04bf792522fd8b6bc2395913fb358cfb732c4e90d544aca47e0bf`. The file records no export date; its modification time, 2025-04-10, is used as the version date.
- Contents: every non-empty `symbol`, `alias_symbol` and `prev_symbol` value (multi-value cells split on `|`), all locus groups, one per line, sorted. 101,592 lines; 101,245 distinct after the case-insensitive load.
- File sha256 as built (UTF-8, CRLF line endings): `a7418d23431d22ce3c2175bf2d15942ee69d47a6db28f8d9a095419d05116885`.
- Known issue: the export had passed through a spreadsheet program, and 22 alias/previous-symbol cells were converted to dates (e.g. `1-Mar`, `6-Sep`). They are carried as-is. The next build should be regenerated from HGNC's official tab-delimited download (https://storage.googleapis.com/public-download-files/hgnc/tsv/tsv/hgnc_complete_set.txt).
