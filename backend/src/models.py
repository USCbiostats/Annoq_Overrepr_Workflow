from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from src.query import ChromosomeQuery, GeneQuery, IdsQuery, InputType, KeywordQuery, RsIdListQuery, RsIdQuery


class GeneInfo(BaseModel):
    PANTHER_ID: str = Field(..., description="PANTHER ID of the gene")

    PANTHER_family: str = Field(..., description="PANTHER family of the gene")

    PANTHER_Subfamily: str = Field(..., description="PANTHER subfamily of the gene")

    PANTHER_Pathway: str = Field(..., description="PANTHER pathway of the gene")

    Protein_Class: str = Field(..., description="Protein class of the gene")

    Reactome_Pathway: str = Field(..., description="Reactome pathway of the gene")

    GO_database_MF_complete: str = Field(
        ..., description="GO database MF complete of the gene"
    )

    GO_database_BP_complete: str = Field(
        ..., description="GO database BP complete of the gene"
    )

    GO_database_CC_complete: str = Field(
        ..., description="GO database CC complete of the gene"
    )

    PANTHER_GO_slim_Molecular_Function: str = Field(
        ..., description="PANTHER GO-slim Molecular Function of the gene"
    )

    PANTHER_GO_slim_Biological_Process: str = Field(
        ..., description="PANTHER GO-slim Biological Process of the gene"
    )

    PANTHER_GO_slim_Cellular_Component: str = Field(
        ..., description="PANTHER GO-slim Cellular Component of the gene"
    )


class GeneMappingsResponse(BaseModel):
    """Response model for gene mappings."""

    gene_list: list[str] = Field(
        ..., description="List of genes to use for overrepresentation analysis"
    )

    rsId_genes_map: dict[str, list[str]] = Field(
        ..., description="Mapping of variant key (rsID or chr:pos) to genes"
    )


class PantherGeneInfoRequest(BaseModel):
    """Request model for PANTHER geneinfo lookups."""

    gene_list: list[str] = Field(..., description="List of genes to annotate")


class PantherGeneInfoResponse(BaseModel):
    """Response model for PANTHER gene metadata lookups."""

    panther_gene_info: dict[str, GeneInfo] = Field(
        ...,
        description="Mapping of PANTHER Gene ID to its information.",
    )

    gene_panther_mapping: dict[str, list[str]] = Field(
        ...,
        description="Mapping of gene to PANTHER Gene IDs. One gene can be associated with multiple PANTHER Gene IDs.",
    )


class OverrepresentationCorrection(str, Enum):
    BONFERRONI = "BONFERRONI"
    FDR = "FDR"
    NONE = "NONE"


class OverrepresentationTestType(str, Enum):
    FISHER = "FISHER"
    BINOMIAL = "BINOMIAL"


class WorkflowInputRequest(BaseModel):
    """Shared SNPWay workflow input request model."""

    input_type: InputType = Field(..., description="Input mode for the query")
    chrQuery: ChromosomeQuery | None = Field(
        default=None, description="Chromosome query payload"
    )
    rsIdQuery: RsIdQuery | None = Field(default=None, description="Single rsID query")
    rsIdListQuery: RsIdListQuery | None = Field(
        default=None, description="rsID list query payload"
    )
    idsQuery: IdsQuery | None = Field(
        default=None,
        description=(
            "ID list query payload. Preferred format for VCF-derived inputs is chr:pos"
        ),
    )
    geneQuery: GeneQuery | None = Field(default=None, description="Gene query payload")
    keywordQuery: KeywordQuery | None = Field(
        default=None, description="Keyword query payload"
    )


class WorkflowGeneMappingsResponse(GeneMappingsResponse):
    """Workflow mapping response that also includes PANTHER gene metadata."""

    panther_gene_info: dict[str, GeneInfo] = Field(
        ...,
        description="Mapping of PANTHER Gene ID to gene metadata.",
    )
    gene_panther_mapping: dict[str, list[str]] = Field(
        ...,
        description="Mapping of gene symbol to one or more PANTHER Gene IDs.",
    )


class OverrepresentationResultItem(BaseModel):
    """Normalized overrepresentation result item used by SNPWay UI and clients."""

    termId: str
    process: str
    refCount: int
    uploadCount: int
    expected: float
    foldEnrichment: float
    overUnder: str
    pValue: float
    fdr: float
    mapped_ids: list[str]


class WorkflowOverrepresentationRequest(WorkflowInputRequest):
    """Request model for the full SNPWay workflow endpoint."""

    annotDataSet: str = Field(..., description="PANTHER annotation dataset ID")
    correction: OverrepresentationCorrection = Field(
        default=OverrepresentationCorrection.FDR,
        description="Multiple testing correction method",
    )
    enrichmentTestType: OverrepresentationTestType = Field(
        default=OverrepresentationTestType.FISHER,
        description="PANTHER enrichment test type",
    )


class WorkflowOverrepresentationResponse(WorkflowGeneMappingsResponse):
    """Compact overrepresentation response used by the UI and client libraries."""

    overrepresentation_results: list[OverrepresentationResultItem] = Field(
        ...,
        description="Normalized overrepresentation result terms.",
    )
