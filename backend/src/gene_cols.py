from typing import Callable

from src.gene_extractors import (
    delimited_gene_extractor,
    extract_ensembl_gene_ids,
    extract_refseq_gene_ids,
)

# Define the gene columns to be used in the analysis
GENE_COLS: list[tuple[str, Callable[[str], list[str]]]] = [
    ("ANNOVAR_ensembl_Gene_ID", extract_ensembl_gene_ids),
    ("ANNOVAR_refseq_Gene_ID", extract_refseq_gene_ids),
    ("SnpEff_ensembl_Gene_ID", extract_ensembl_gene_ids),
    ("SnpEff_refseq_Gene_ID", extract_refseq_gene_ids),
    ("VEP_ensembl_Gene_ID", extract_ensembl_gene_ids),
    ("VEP_refseq_Gene_Name", extract_refseq_gene_ids),
    ("enhancer_linked_genes", lambda gene_str: delimited_gene_extractor(gene_str, ";")),
]
