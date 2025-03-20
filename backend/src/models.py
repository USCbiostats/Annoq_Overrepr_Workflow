from pydantic import BaseModel, Field


class GeneMappingsResponse(BaseModel):
    """Response model for gene mappings."""

    gene_list: list[str] = Field(
        ..., description="List of genes to use for overrepresentation analysis"
    )
