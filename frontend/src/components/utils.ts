import { GeneMappingResponse } from "../models";

// Interface for the table row structure
export interface ResultTableRow {
  rsId: string;
  PANTHER_ID: string;
  mappedGenes: string[]; // Genes that map to both rsID and PANTHER_ID
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

// Helper function to get columns relevant to a specific annotation dataset
const getRelevantColumns = (
  annotationDataset?: string
): (keyof ResultTableRow)[] => {
  // Always include these base columns
  const baseColumns: (keyof ResultTableRow)[] = [
    "rsId",
    "PANTHER_ID",
    "mappedGenes",
  ];

  if (!annotationDataset) {
    // If no dataset specified or 'all columns' selected, return all columns
    return [
      ...baseColumns,
      "PANTHER_family",
      "PANTHER_Subfamily",
      "PANTHER_Pathway",
      "Protein_Class",
      "Reactome_Pathway",
      "GO_database_MF_complete",
      "GO_database_BP_complete",
      "GO_database_CC_complete",
      "PANTHER_GO_slim_Molecular_Function",
      "PANTHER_GO_slim_Biological_Process",
      "PANTHER_GO_slim_Cellular_Component",
    ];
  }

  // Add relevant columns based on the annotation dataset
  switch (annotationDataset) {
    case "GO:0008150":
      return [...baseColumns, "GO_database_BP_complete"];
    case "GO:0003674":
      return [...baseColumns, "GO_database_MF_complete"];
    case "GO:0005575":
      return [...baseColumns, "GO_database_CC_complete"];
    case "ANNOT_TYPE_ID_PANTHER_PATHWAY":
      return [...baseColumns, "PANTHER_Pathway"];
    case "ANNOT_TYPE_ID_PANTHER_GO_SLIM_MF":
      return [...baseColumns, "PANTHER_GO_slim_Molecular_Function"];
    case "ANNOT_TYPE_ID_PANTHER_GO_SLIM_BP":
      return [...baseColumns, "PANTHER_GO_slim_Biological_Process"];
    case "ANNOT_TYPE_ID_PANTHER_GO_SLIM_CC":
      return [...baseColumns, "PANTHER_GO_slim_Cellular_Component"];
    case "ANNOT_TYPE_ID_PANTHER_PC":
      return [...baseColumns, "Protein_Class"];
    case "ANNOT_TYPE_ID_REACTOME_PATHWAY":
      return [...baseColumns, "Reactome_Pathway"];
    default:
      return getRelevantColumns(undefined); // Default to all columns
  }
};

export const createResultsTableData = (
  geneMappingResponse: GeneMappingResponse,
  pantherIdsToInclude?: string[],
  annotationDataset?: string
): ResultTableRow[] => {
  const { rsId_genes_map, panther_gene_info, gene_panther_mapping } =
    geneMappingResponse;

  const tableData: ResultTableRow[] = [];
  const processedPairs = new Set<string>(); // To avoid duplicate rows

  // Create a Set from the pantherIdsToInclude array for faster lookups
  const pantherIdsSet = pantherIdsToInclude
    ? new Set(pantherIdsToInclude)
    : null;

  // Iterate through each rsID
  for (const rsId in rsId_genes_map) {
    const genesForRsId = rsId_genes_map[rsId];

    // For each gene associated with this rsID
    for (const gene of genesForRsId) {
      // Get PANTHER IDs for this gene
      const pantherIdsForGene = gene_panther_mapping[gene] || [];

      // For each PANTHER ID associated with this gene
      for (const pantherId of pantherIdsForGene) {
        // Skip if not in the subset (when subset is provided)
        if (pantherIdsSet && !pantherIdsSet.has(pantherId)) continue;

        // Create a unique key for this (rsID, PANTHER_ID) pair
        const pairKey = `${rsId}-${pantherId}`;

        // Skip if we've already processed this pair
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Find all genes that map to both the current rsID and PANTHER ID
        const mappedGenes = genesForRsId.filter((g) =>
          (gene_panther_mapping[g] || []).includes(pantherId)
        );

        // Get the gene info for this PANTHER ID
        const geneInfo = panther_gene_info[pantherId];

        // Add a row to our table data
        if (geneInfo) {
          tableData.push({
            rsId,
            PANTHER_ID: pantherId,
            mappedGenes,
            PANTHER_family: geneInfo.PANTHER_family,
            PANTHER_Subfamily: geneInfo.PANTHER_Subfamily,
            PANTHER_Pathway: geneInfo.PANTHER_Pathway,
            Protein_Class: geneInfo.Protein_Class,
            Reactome_Pathway: geneInfo.Reactome_Pathway,
            GO_database_MF_complete: geneInfo.GO_database_MF_complete,
            GO_database_BP_complete: geneInfo.GO_database_BP_complete,
            GO_database_CC_complete: geneInfo.GO_database_CC_complete,
            PANTHER_GO_slim_Molecular_Function:
              geneInfo.PANTHER_GO_slim_Molecular_Function,
            PANTHER_GO_slim_Biological_Process:
              geneInfo.PANTHER_GO_slim_Biological_Process,
            PANTHER_GO_slim_Cellular_Component:
              geneInfo.PANTHER_GO_slim_Cellular_Component,
          });
        }
      }
    }
  }

  // Get only the columns we want to include
  const columnsToInclude = getRelevantColumns(annotationDataset);

  // If we want all columns, just return the full tableData
  if (!annotationDataset) {
    return tableData;
  }

  // Otherwise, filter the columns for each row
  return tableData.map((row) => {
    const filteredRow: Partial<ResultTableRow> = {};
    columnsToInclude.forEach((column) => {
      filteredRow[column] = row[column] as any;
    });
    return filteredRow as ResultTableRow;
  });
};

export const createSubsetResultsTableData = (
  geneMappingResponse: GeneMappingResponse,
  pantherIdsInSubset: string[]
): ResultTableRow[] => {
  return createResultsTableData(geneMappingResponse, pantherIdsInSubset);
};
