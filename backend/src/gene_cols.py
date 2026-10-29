from enum import Enum
from typing import Callable

from src.gene_extractors import (
    delimited_gene_extractor,
    extract_ensembl_gene_ids,
    extract_refseq_gene_ids_fixed,
)


class GeneMappingField(str, Enum):
    """AnnoQ gene columns that can be used to map SNPs to genes."""

    ANNOVAR_ensembl = "ANNOVAR_ensembl_Gene_ID"
    ANNOVAR_refseq = "ANNOVAR_refseq_Gene_ID"
    SnpEff_ensembl = "SnpEff_ensembl_Gene_ID"
    SnpEff_refseq = "SnpEff_refseq_Gene_ID"
    VEP_ensembl = "VEP_ensembl_Gene_ID"
    VEP_refseq = "VEP_refseq_Gene_Name"
    enhancer_linked_genes = "enhancer_linked_genes"


# Define the gene columns to be used in the analysis
GENE_COLS: dict[GeneMappingField, Callable[[str], list[str]]] = {
    GeneMappingField.ANNOVAR_ensembl: extract_ensembl_gene_ids,
    GeneMappingField.ANNOVAR_refseq: extract_refseq_gene_ids_fixed,
    GeneMappingField.SnpEff_ensembl: extract_ensembl_gene_ids,
    GeneMappingField.SnpEff_refseq: extract_refseq_gene_ids_fixed,
    GeneMappingField.VEP_ensembl: extract_ensembl_gene_ids,
    GeneMappingField.VEP_refseq: extract_refseq_gene_ids_fixed,
    GeneMappingField.enhancer_linked_genes: lambda gene_str: delimited_gene_extractor(
        gene_str, ";"
    ),
}

ALL_GENE_MAPPING_FIELDS: list[GeneMappingField] = list(GENE_COLS)
