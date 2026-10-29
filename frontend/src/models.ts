export type GeneInfo = {
    PANTHER_ID: string;
    PANTHER_family: string;
    PANTHER_Subfamily: string;
    PANTHER_Pathway: string;
    Protein_Class: string;
    Reactome_Pathway: string;
    GO_database_MF_complete: string;
    GO_database_BP_complete: string;
    GO_database_CC_complete: string;
    PANTHER_GO_slim_Molecular_Function: string;
    PANTHER_GO_slim_Biological_Process: string;
    PANTHER_GO_slim_Cellular_Component: string;
}

export type OverrepresentationResultItem = {
    termId: string;
    process: string;
    refCount: number;
    uploadCount: number;
    expected: number | null;
    foldEnrichment: number | null;
    overUnder: string;
    pValue: number | null;
    fdr: number | null;
    mapped_ids: string[];
}

export type VariantStatus = "annotated" | "no_record" | "no_gene";

export type VariantReportRow = {
    input: string; // The variant as submitted
    variant_key: string | null; // rsId_genes_map key of the matching AnnoQ record; null for no_record
    status: VariantStatus;
    n_genes: number;
}

export type GeneIdentifierReportRow = {
    identifier: string; // Gene identifier sent to PANTHER
    mapped_by_panther: "yes" | "no" | "not_listed";
    panther_listed_as: string | null;
    panther_match: "exact" | "version_suffix_removed" | "not_listed";
}

export type InputReportSummary = {
    n_input: number;
    n_annotated: number;
    n_no_record: number;
    n_no_gene: number;
    n_records_not_matched_to_input: number;
    n_identifiers_submitted: number;
    n_identifiers_mapped_reported_by_panther: number | null; // null when no overrepresentation test was run
    n_identifiers_matched_incl_suffix_rule: number | null; // mapped_by_panther "yes", incl. ".N" suffix matches
    n_identifiers_not_mapped_by_panther: number | null;
    n_identifiers_not_listed_by_panther: number | null;
}

export type InputReport = {
    summary: InputReportSummary;
    variants: VariantReportRow[];
    gene_identifiers: GeneIdentifierReportRow[] | null;
}

export type GeneMappingResponse = {
    gene_list: string[]; // List of all genes
    rsId_genes_map: Record<string, string[]>; // Mapping of variant key (rsID or chr:pos) to genes
    input_report?: InputReport | null; // Status of each submitted variant and gene identifier
}

export type PantherGeneInfoResponse = {
    panther_gene_info: Record<string, GeneInfo>; // Mapping of PANTHER_ID to GeneInfo
    gene_panther_mapping: Record<string, string[]>; // Mapping of gene to PANTHER_IDs
}

export type GeneMappingDownloadData = GeneMappingResponse & PantherGeneInfoResponse;

export type WorkflowGeneMappingsResponse = GeneMappingDownloadData;

export type WorkflowOverrepresentationResponse = GeneMappingDownloadData & {
    overrepresentation_results: OverrepresentationResultItem[];
    reference_gene_list?: string[] | null; // Genes from the custom reference list; null when PANTHER's default reference was used
}

// Progress events from POST /workflow/overrepresentation/stream.
export type WorkflowStageName =
    | "input"
    | "reference"
    | "overrepresentation"
    | "gene_details";

export type WorkflowStageStatus = "pending" | "running" | "done" | "failed";

export type WorkflowStageEvent = {
    event: "stage";
    stage: WorkflowStageName;
    status: WorkflowStageStatus;
    done: number | null; // Batches finished, when the stage reports batches
    total: number | null;
}

export type WorkflowErrorEvent = {
    event: "error";
    stage: WorkflowStageName | null;
    status: number; // HTTP status
    detail: string;
}

export type WorkflowStreamEvent =
    | WorkflowStageEvent
    | { event: "result"; data: WorkflowOverrepresentationResponse }
    | { event: "gene_details"; data: PantherGeneInfoResponse }
    | WorkflowErrorEvent
    | { event: "heartbeat" };

// Client-side view of one stage, built from its stage events.
export type WorkflowStageProgress = {
    status: WorkflowStageStatus;
    done: number | null;
    total: number | null;
    startedAt: number | null; // ms timestamps
    finishedAt: number | null;
}
