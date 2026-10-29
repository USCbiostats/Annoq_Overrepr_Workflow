import { describe, expect, it } from "vitest";
import { CorrectionType } from "../constants";
import { OverrepresentationResultItem } from "../models";
import {
  getSignificantResults,
  isUnclassified,
  runStampLines,
  withRunDate,
} from "./utils";

const term = (
  process: string,
  pValue: number,
  fdr: number
): OverrepresentationResultItem => ({
  termId: process === "UNCLASSIFIED" ? "" : "P00000",
  process,
  refCount: 100,
  uploadCount: 5,
  expected: 1,
  foldEnrichment: 5,
  overUnder: "+",
  pValue,
  fdr,
  mapped_ids: ["GENEA"],
});

describe("getSignificantResults", () => {
  const rows = [
    term("UNCLASSIFIED", 1.5e-8, 2.4e-6),
    term("TGF-beta signaling pathway", 5.1e-6, 4.1e-4),
    term("Wnt signaling pathway", 5.9e-3, 0.16),
  ];

  it("never counts UNCLASSIFIED as significant", () => {
    expect(
      getSignificantResults(rows, CorrectionType.FDR).map((row) => row.process)
    ).toEqual(["TGF-beta signaling pathway"]);
    expect(
      getSignificantResults(rows, CorrectionType.NONE).map((row) => row.process)
    ).toEqual(["TGF-beta signaling pathway", "Wnt signaling pathway"]);
  });

  it("identifies the UNCLASSIFIED row", () => {
    expect(rows.map(isUnclassified)).toEqual([true, false, false]);
  });
});

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
