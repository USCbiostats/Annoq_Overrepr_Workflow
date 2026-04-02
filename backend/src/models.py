from pydantic import BaseModel, Field


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
        ..., description="Mapping of rsId to genes"
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
