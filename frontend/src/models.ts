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

export type GeneMappingResponse = {
    gene_list: string[]; // List of all genes
    rsId_genes_map: Record<string, string[]>; // Mapping of variant key (rsID or chr:pos) to genes
}

export type PantherGeneInfoResponse = {
    panther_gene_info: Record<string, GeneInfo>; // Mapping of PANTHER_ID to GeneInfo
    gene_panther_mapping: Record<string, string[]>; // Mapping of gene to PANTHER_IDs
}

export type GeneMappingDownloadData = GeneMappingResponse & PantherGeneInfoResponse;

export type WorkflowGeneMappingsResponse = GeneMappingDownloadData;

export type WorkflowOverrepresentationResponse = GeneMappingDownloadData & {
    overrepresentation_results: OverrepresentationResultItem[];
}