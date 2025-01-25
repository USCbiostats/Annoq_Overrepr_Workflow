from typing import Callable
from src.gene_extractors import ensemble_gene_extractor

# Define the gene columns to be used in the analysis
GENE_COLS: list[tuple[str, Callable[[str], list[str]]]] = [
        ("ANNOVAR_ensembl_Gene_ID", ensemble_gene_extractor),
        ("SnpEff_ensembl_Gene_ID", ensemble_gene_extractor),
        ("VEP_ensembl_Gene_ID", ensemble_gene_extractor)
]


