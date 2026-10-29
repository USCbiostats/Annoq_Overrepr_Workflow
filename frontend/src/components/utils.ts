import { CorrectionType } from "../constants";
import {
  GeneMappingDownloadData,
  InputReport,
  OverrepresentationResultItem,
  RunVersions,
} from "../models";
import { parseVcfLines } from "../utils";

// PANTHER reports the genes in no category as an UNCLASSIFIED row with a
// p-value and FDR. It is not a category: it is never counted as significant
// and has no per-category download.
export const isUnclassified = (row: OverrepresentationResultItem): boolean =>
  row.process === "UNCLASSIFIED";

export const getSignificantResults = (
  rows: OverrepresentationResultItem[],
  correctionType: CorrectionType
): OverrepresentationResultItem[] =>
  rows.filter((row) => {
    if (isUnclassified(row)) {
      return false;
    }

    if (correctionType === CorrectionType.FDR) {
      return row.fdr !== null && row.fdr < 0.05;
    }

    return row.pValue !== null && row.pValue < 0.05;
  });

const csvText = (value: string | null): string =>
  `"${(value ?? "").replace(/"/g, '""')}"`;

// "# name,value" lines with the report summary, placed above the table.
const summaryHeaderLines = (report: InputReport): string[] =>
  Object.entries(report.summary).map(
    ([name, value]) => `# ${name},${value ?? ""}`
  );

// One row per submitted variant: annotated, no_record or no_gene. With the
// original VCF text, one row per VCF data line instead: the position-level
// status joined back to the line, and status "invalid" for lines skipped at
// parse time.
export const createInputVariantReportCsv = (
  report: InputReport,
  inputColumnLabel: string,
  vcfText: string | null = null
): string => {
  if (vcfText === null) {
    return (
      [
        ...summaryHeaderLines(report),
        `${inputColumnLabel},variant_key,status,n_genes`,
        ...report.variants.map((row) =>
          [
            csvText(row.input),
            csvText(row.variant_key),
            row.status,
            row.n_genes,
          ].join(",")
        ),
      ].join("\n") + "\n"
    );
  }

  const variantsBySubmittedId = new Map(
    report.variants.map((row) => [row.input, row])
  );
  const vcfLines = parseVcfLines(vcfText);
  return (
    [
      ...summaryHeaderLines(report),
      `# n_vcf_data_lines,${vcfLines.length}`,
      `# n_vcf_lines_invalid,${vcfLines.filter((line) => line.submittedId === null).length}`,
      `vcf_line,CHROM,POS,ID,REF,ALT,${inputColumnLabel},variant_key,status,n_genes`,
      ...vcfLines.map((line) => {
        const variant =
          line.submittedId === null
            ? undefined
            : variantsBySubmittedId.get(line.submittedId);
        const status =
          line.submittedId === null
            ? "invalid"
            : variant?.status ?? "not_in_report";
        return [
          line.lineNumber,
          csvText(line.chrom),
          csvText(line.pos),
          csvText(line.id),
          csvText(line.ref),
          csvText(line.alt),
          csvText(line.submittedId),
          csvText(variant?.variant_key ?? null),
          status,
          variant ? variant.n_genes : "",
        ].join(",");
      }),
    ].join("\n") + "\n"
  );
};

export type RunStamp = {
  versions: RunVersions | null | undefined;
  geneMappingFields: string[];
  testType: string;
  correction: string;
  runDate: string; // YYYY-MM-DD
  annotationDataset: string; // e.g. ANNOT_TYPE_ID_PANTHER_PATHWAY
};

// "# name,value" lines with the versions and settings of the run, placed at
// the top of every download. Values that are not known are written as unknown.
export const runStampLines = (stamp: RunStamp): string[] => {
  const known = (value: string | null | undefined) => value || "unknown";
  return [
    `# annoq_panel,${known(stamp.versions?.annoq_panel)}`,
    `# dbsnp_release,${known(stamp.versions?.dbsnp_release)}`,
    `# panther_version,${known(stamp.versions?.panther_version)}`,
    `# panther_tool_release,${known(stamp.versions?.panther_tool_release)}`,
    `# gene_mapping_sources,${known(stamp.geneMappingFields.join(";"))}`,
    `# test,${known(stamp.testType)}`,
    `# correction,${known(stamp.correction)}`,
    `# run_date,${known(stamp.runDate)}`,
    `# annotation_dataset,${known(stamp.annotationDataset)}`,
  ];
};

// Local date of a run as YYYY-MM-DD.
export const formatRunDate = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

// "results.csv" -> "results_2026-10-29.csv"
export const withRunDate = (fileName: string, runDate: string): string =>
  runDate ? fileName.replace(/(\.csv)?$/, `_${runDate}$1`) : fileName;

export const saveCsvFile = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// One row per gene identifier sent to PANTHER, with PANTHER's mapped status.
export const createGeneIdentifierReportCsv = (report: InputReport): string =>
  [
    ...summaryHeaderLines(report),
    "identifier,mapped_by_panther,panther_listed_as,panther_match",
    ...(report.gene_identifiers ?? []).map((row) =>
      [
        csvText(row.identifier),
        row.mapped_by_panther,
        csvText(row.panther_listed_as),
        row.panther_match,
      ].join(",")
    ),
  ].join("\n") + "\n";

// Interface for the table row structure
export interface ResultTableRow {
  rsId: string;
  PANTHER_ID: string;
  mappedGenes: string[]; // Genes that map to both rsID and PANTHER_ID
  status: string; // Input variant status from the input report
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
    "status",
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
  geneMappingResponse: GeneMappingDownloadData,
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
            status: "annotated",
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

  // The full download has a row for every input variant: no_record and
  // no_gene variants, and annotated variants with no PANTHER row, appear
  // with empty PANTHER fields.
  if (!pantherIdsSet && geneMappingResponse.input_report) {
    const variantsWithRows = new Set(tableData.map((row) => row.rsId));
    for (const variant of geneMappingResponse.input_report.variants) {
      const rsId = variant.variant_key ?? variant.input;
      if (variantsWithRows.has(rsId)) continue;
      variantsWithRows.add(rsId);
      tableData.push({
        rsId,
        PANTHER_ID: "",
        mappedGenes:
          variant.status === "annotated" ? rsId_genes_map[rsId] || [] : [],
        status: variant.status,
        PANTHER_family: "",
        PANTHER_Subfamily: "",
        PANTHER_Pathway: "",
        Protein_Class: "",
        Reactome_Pathway: "",
        GO_database_MF_complete: "",
        GO_database_BP_complete: "",
        GO_database_CC_complete: "",
        PANTHER_GO_slim_Molecular_Function: "",
        PANTHER_GO_slim_Biological_Process: "",
        PANTHER_GO_slim_Cellular_Component: "",
      });
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
  geneMappingResponse: GeneMappingDownloadData,
  pantherIdsInSubset: string[]
): ResultTableRow[] => {
  return createResultsTableData(geneMappingResponse, pantherIdsInSubset);
};
