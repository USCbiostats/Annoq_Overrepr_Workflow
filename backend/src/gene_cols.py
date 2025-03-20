from typing import Callable
from src.gene_extractors import delimited_gene_extractor

# Define the gene columns to be used in the analysis
GENE_COLS: list[tuple[str, Callable[[str], list[str]]]] = [
        ("ANNOVAR_ensembl_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("ANNOVAR_refseq_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("SnpEff_ensembl_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("SnpEff_refseq_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("VEP_ensembl_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("VEP_refseq_Gene_ID", lambda gene_str: delimited_gene_extractor(gene_str, "|")),
        ("enhancer_linked_genes", lambda gene_str: delimited_gene_extractor(gene_str, ";")),
]


