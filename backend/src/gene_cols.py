from enum import Enum
from typing import Callable

from src.gene_extractors import (
    delimited_gene_extractor,
    extract_ensembl_gene_ids,
    extract_refseq_gene_ids_fixed,
)


class GeneMappingField(str, Enum):
    """SNP-to-gene mapping sources a request can select."""

    ANNOVAR_ensembl = "ANNOVAR_ensembl_Gene_ID"
    ANNOVAR_refseq = "ANNOVAR_refseq_Gene_ID"
    SnpEff_ensembl = "SnpEff_ensembl_Gene_ID"
    SnpEff_refseq = "SnpEff_refseq_Gene_ID"
    VEP_ensembl = "VEP_ensembl_Gene_ID"
    VEP_refseq = "VEP_refseq_Gene_Name"
    enhancer_linked_genes = "enhancer_linked_genes"


class GeneColumn(str, Enum):
    """AnnoQ gene columns queried and read (values are AnnoQ query field names)."""

    ANNOVAR_ensembl = "ANNOVAR_ensembl_Gene_ID"
    ANNOVAR_ensembl_closest = "ANNOVAR_ensembl_Closest_gene"
    ANNOVAR_refseq = "ANNOVAR_refseq_Gene_ID"
    ANNOVAR_refseq_closest = "ANNOVAR_refseq_Closest_gene"
    SnpEff_ensembl = "SnpEff_ensembl_Gene_ID"
    SnpEff_refseq = "SnpEff_refseq_Gene_ID"
    VEP_ensembl = "VEP_ensembl_Gene_ID"
    VEP_refseq = "VEP_refseq_Gene_Name"
    enhancer_linked_genes = "enhancer_linked_genes"


# Define the gene columns to be used in the analysis, in column order.
# Closest-gene cells read "gene:transcript(dist=d),gene:transcript(dist=d)"; the
# Ensembl and RefSeq extractors already drop the transcript, distance and NONE parts.
GENE_COLS: dict[GeneColumn, Callable[[str], list[str]]] = {
    GeneColumn.ANNOVAR_ensembl: extract_ensembl_gene_ids,
    GeneColumn.ANNOVAR_ensembl_closest: extract_ensembl_gene_ids,
    GeneColumn.ANNOVAR_refseq: extract_refseq_gene_ids_fixed,
    GeneColumn.ANNOVAR_refseq_closest: extract_refseq_gene_ids_fixed,
    GeneColumn.SnpEff_ensembl: extract_ensembl_gene_ids,
    GeneColumn.SnpEff_refseq: extract_refseq_gene_ids_fixed,
    GeneColumn.VEP_ensembl: extract_ensembl_gene_ids,
    GeneColumn.VEP_refseq: extract_refseq_gene_ids_fixed,
    GeneColumn.enhancer_linked_genes: lambda gene_str: delimited_gene_extractor(
        gene_str, ";"
    ),
}

ALL_GENE_MAPPING_FIELDS: list[GeneMappingField] = list(GeneMappingField)

# Annotation tool behind each source, named as in AnnoQ's /annotations metadata;
# enhancer-linked genes come from no annotation tool.
ANNOTATORS = ("ANNOVAR", "SnpEff", "VEP")
FIELD_ANNOTATOR: dict[GeneMappingField, str | None] = {
    GeneMappingField.ANNOVAR_ensembl: "ANNOVAR",
    GeneMappingField.ANNOVAR_refseq: "ANNOVAR",
    GeneMappingField.SnpEff_ensembl: "SnpEff",
    GeneMappingField.SnpEff_refseq: "SnpEff",
    GeneMappingField.VEP_ensembl: "VEP",
    GeneMappingField.VEP_refseq: "VEP",
    GeneMappingField.enhancer_linked_genes: None,
}

# Selecting an ANNOVAR gene model also reads its closest-gene column, the two
# genes flanking an intergenic variant.
FIELD_COLUMNS: dict[GeneMappingField, list[GeneColumn]] = {
    field: [GeneColumn(field.value)] for field in GeneMappingField
}
FIELD_COLUMNS[GeneMappingField.ANNOVAR_ensembl].append(GeneColumn.ANNOVAR_ensembl_closest)
FIELD_COLUMNS[GeneMappingField.ANNOVAR_refseq].append(GeneColumn.ANNOVAR_refseq_closest)

# A closest-gene column is used only where its genic column gives no gene.
FALLBACK_FOR: dict[GeneColumn, GeneColumn] = {
    GeneColumn.ANNOVAR_ensembl_closest: GeneColumn.ANNOVAR_ensembl,
    GeneColumn.ANNOVAR_refseq_closest: GeneColumn.ANNOVAR_refseq,
}

# AnnoQ download headers that differ from the query field name.
ANNOQ_DOWNLOAD_COLUMN_NAMES: dict[str, str] = {
    "ANNOVAR_ensembl_Closest_gene(intergenic_only)": GeneColumn.ANNOVAR_ensembl_closest.value,
    "ANNOVAR_refseq_Closest_gene(intergenic_only)": GeneColumn.ANNOVAR_refseq_closest.value,
}


def gene_columns_for(fields: list[GeneMappingField]) -> list[GeneColumn]:
    """Gene columns behind the selected sources, in column order."""
    selected = {column for field in fields for column in FIELD_COLUMNS[field]}
    return [column for column in GENE_COLS if column in selected]


def annotators_for(fields: list[GeneMappingField]) -> list[str]:
    """Annotation tools behind the selected sources, in ANNOTATORS order."""
    used = {FIELD_ANNOTATOR[field] for field in fields}
    return [tool for tool in ANNOTATORS if tool in used]
