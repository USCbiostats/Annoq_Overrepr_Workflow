from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator

from src.gene_cols import ALL_GENE_MAPPING_FIELDS, GeneMappingField
from src.query import (
    GeneListQuery,
    GeneQuery,
    IdsQuery,
    InputType,
    KeywordQuery,
    RsIdListQuery,
    RsIdQuery,
)


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

    rsId_gene_sources: dict[str, dict[str, list[GeneMappingField]]] = Field(
        default_factory=dict,
        description=(
            "For each variant key and gene in rsId_genes_map, the selected gene "
            "columns that produced the assignment"
        ),
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


class SnpListInput(BaseModel):
    """A list of SNPs plus the AnnoQ gene columns used to map them to genes."""

    input_type: InputType = Field(..., description="Input mode for the query")
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
    geneMappingFields: list[GeneMappingField] = Field(
        default_factory=lambda: list(ALL_GENE_MAPPING_FIELDS),
        min_length=1,
        description=(
            "AnnoQ gene columns (SNP-to-gene mapping tools) used to map SNPs to "
            "genes. Defaults to all available columns."
        ),
    )

    @field_validator("geneMappingFields")
    @classmethod
    def _dedupe_gene_mapping_fields(
        cls, fields: list[GeneMappingField]
    ) -> list[GeneMappingField]:
        return list(dict.fromkeys(fields))


class WorkflowInputRequest(SnpListInput):
    """Shared SNPWay workflow input request model."""

    @field_validator("input_type")
    @classmethod
    def _reject_gene_list_input(cls, input_type: InputType) -> InputType:
        if input_type == InputType.geneList:
            raise ValueError(
                "input_type 'geneList' is only supported for referenceList"
            )
        return input_type


class ReferenceListInput(SnpListInput):
    """Custom reference list used in place of PANTHER's all-genes reference.

    Either SNPs ('ids' or 'rsIdList'), which are mapped to genes through AnnoQ
    using geneMappingFields, or a 'geneList' sent to PANTHER as it is.
    """

    geneListQuery: GeneListQuery | None = Field(
        default=None,
        description=(
            "Gene IDs for input_type 'geneList' (any ID type PANTHER accepts, "
            "e.g. gene symbols or Ensembl IDs). geneMappingFields is ignored."
        ),
    )

    @field_validator("input_type")
    @classmethod
    def _validate_reference_input_type(cls, input_type: InputType) -> InputType:
        if input_type not in (InputType.ids, InputType.rsIdList, InputType.geneList):
            raise ValueError(
                "Reference list input_type must be 'ids', 'rsIdList' or 'geneList'"
            )
        return input_type


class VariantStatus(str, Enum):
    annotated = "annotated"  # in rsId_genes_map
    no_record = "no_record"  # AnnoQ returned no record for the input
    no_gene = "no_gene"  # AnnoQ record, but no gene in the selected gene columns


class VariantReportRow(BaseModel):
    """What happened to one submitted variant (rsID or chr:pos)."""

    input: str = Field(..., description="The variant as submitted")
    variant_key: str | None = Field(
        ...,
        description=(
            "Key of the matching AnnoQ record (the rsId_genes_map key); null for "
            "no_record"
        ),
    )
    status: VariantStatus
    n_genes: int = Field(..., description="Genes mapped to the variant")


class PantherMatch(str, Enum):
    exact = "exact"  # PANTHER lists the identifier as submitted
    version_suffix_removed = "version_suffix_removed"  # listed without ".N"
    not_listed = "not_listed"  # in neither of PANTHER's mapped/unmapped lists


class GeneIdentifierReportRow(BaseModel):
    """Whether PANTHER mapped one submitted gene identifier."""

    identifier: str = Field(..., description="Gene identifier sent to PANTHER")
    mapped_by_panther: str = Field(
        ...,
        description=(
            "'yes' or 'no' from PANTHER's input mapped/unmapped lists; "
            "'not_listed' when PANTHER lists the identifier in neither"
        ),
    )
    panther_listed_as: str | None = Field(
        ..., description="The identifier as PANTHER lists it, or null"
    )
    panther_match: PantherMatch


class InputReportSummary(BaseModel):
    n_input: int = Field(..., description="Unique variants submitted")
    n_annotated: int
    n_no_record: int
    n_no_gene: int
    n_records_not_matched_to_input: int = Field(
        ...,
        description="AnnoQ records returned that match no submitted variant",
    )
    n_identifiers_submitted: int = Field(
        ..., description="Unique gene identifiers in gene_list"
    )
    n_identifiers_mapped_reported_by_panther: int | None = Field(
        ...,
        description=(
            "Entries in PANTHER's mapped input list; null when no "
            "overrepresentation test was run"
        ),
    )
    n_identifiers_matched_incl_suffix_rule: int | None = Field(
        ...,
        description=(
            "Submitted identifiers with mapped_by_panther 'yes', counting "
            "matches after removing a '.N' suffix; null when no "
            "overrepresentation test was run"
        ),
    )
    n_identifiers_not_mapped_by_panther: int | None
    n_identifiers_not_listed_by_panther: int | None


class InputReport(BaseModel):
    """Accounts for every submitted variant and gene identifier."""

    summary: InputReportSummary
    variants: list[VariantReportRow] = Field(
        ..., description="One row per unique submitted variant, in input order"
    )
    gene_identifiers: list[GeneIdentifierReportRow] | None = Field(
        ...,
        description=(
            "One row per gene identifier sent to PANTHER; null when no "
            "overrepresentation test was run"
        ),
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
    input_report: InputReport | None = Field(
        default=None,
        description="Status of each submitted variant and gene identifier.",
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
    referenceList: ReferenceListInput | None = Field(
        default=None,
        description=(
            "Optional custom reference SNP list. When omitted, PANTHER uses all "
            "human genes as the reference."
        ),
    )


class RunVersions(BaseModel):
    """Data and tool versions behind a run; null when not known."""

    annoq_panel: str | None = Field(
        ..., description="AnnoQ variant panel release (not read by the backend)"
    )
    dbsnp_release: str | None = Field(..., description="dbSNP build of the rsIDs")
    panther_version: str | None = Field(
        ..., description="PANTHER annot_version_release_date"
    )
    panther_tool_release: str | None = Field(
        ..., description="PANTHER tool_release_date"
    )


class WorkflowOverrepresentationResponse(WorkflowGeneMappingsResponse):
    """Compact overrepresentation response used by the UI and client libraries."""

    overrepresentation_results: list[OverrepresentationResultItem] = Field(
        ...,
        description="Normalized overrepresentation result terms.",
    )
    reference_gene_list: list[str] | None = Field(
        default=None,
        description=(
            "Genes mapped from the custom reference list, or null when the "
            "default PANTHER reference (all human genes) was used."
        ),
    )
    run_versions: RunVersions | None = Field(
        default=None,
        description="AnnoQ and PANTHER versions, for stamping downloads.",
    )
