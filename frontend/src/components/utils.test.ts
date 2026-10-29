import { describe, expect, it } from "vitest";
import { runStampLines, withRunDate } from "./utils";

describe("runStampLines", () => {
  it("writes the nine header lines, unknown for missing values", () => {
    expect(
      runStampLines({
        versions: {
          annoq_panel: null,
          dbsnp_release: "151",
          panther_version: "PANTHER version 19.0 Released 2024-06-20",
          panther_tool_release: "20240807",
        },
        geneMappingFields: ["ANNOVAR_ensembl_Gene_ID", "enhancer_linked_genes"],
        testType: "FISHER",
        correction: "FDR",
        runDate: "2026-10-29",
        annotationDataset: "ANNOT_TYPE_ID_PANTHER_PATHWAY",
      })
    ).toEqual([
      "# annoq_panel,unknown",
      "# dbsnp_release,151",
      "# panther_version,PANTHER version 19.0 Released 2024-06-20",
      "# panther_tool_release,20240807",
      "# gene_mapping_sources,ANNOVAR_ensembl_Gene_ID;enhancer_linked_genes",
      "# test,FISHER",
      "# correction,FDR",
      "# run_date,2026-10-29",
      "# annotation_dataset,ANNOT_TYPE_ID_PANTHER_PATHWAY",
    ]);
  });
});

describe("withRunDate", () => {
  it("puts the run date before the .csv extension", () => {
    expect(withRunDate("gene_mapping_results.csv", "2026-10-29")).toBe(
      "gene_mapping_results_2026-10-29.csv"
    );
  });
});
