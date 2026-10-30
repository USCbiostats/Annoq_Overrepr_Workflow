import { describe, expect, it } from "vitest";
import { CorrectionType } from "../constants";
import {
  GeneMappingDownloadData,
  GeneSources,
  InputReport,
  OverrepresentationResultItem,
} from "../models";
import {
  createGeneIdentifierReportCsv,
  createResultsTableData,
  getSignificantResults,
  identifierSources,
  isUnclassified,
  runStampLines,
  variantGeneSources,
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

describe("gene sources", () => {
  const sources: GeneSources = {
    rs1: {
      ENSG00000000001: ["ANNOVAR_ensembl_Gene_ID"],
      GENEA: [
        "ANNOVAR_refseq_Gene_ID",
        "VEP_refseq_Gene_Name",
        "enhancer_linked_genes",
      ],
      GENED: ["enhancer_linked_genes"],
    },
    rs2: { GENEA: ["SnpEff_refseq_Gene_ID"] },
  };

  it("lists every source of a multi-source gene, in column order", () => {
    expect(variantGeneSources(sources, "rs1", ["GENEA"])).toEqual([
      "ANNOVAR-RefSeq",
      "VEP-RefSeq",
      "enhancer",
    ]);
    expect(
      variantGeneSources(sources, "rs1", ["GENEA", "ENSG00000000001"])
    ).toEqual(["ANNOVAR-Ensembl", "ANNOVAR-RefSeq", "VEP-RefSeq", "enhancer"]);
  });

  it("shows only enhancer for an enhancer-only gene", () => {
    expect(variantGeneSources(sources, "rs1", ["GENED"])).toEqual(["enhancer"]);
  });

  it("is empty without genes or without provenance data", () => {
    expect(variantGeneSources(sources, "rs1", [])).toEqual([]);
    expect(variantGeneSources(undefined, "rs1", ["GENEA"])).toEqual([]);
  });

  it("combines an identifier's sources over all its variants", () => {
    expect(identifierSources(sources).get("GENEA")).toEqual([
      "ANNOVAR-RefSeq",
      "SnpEff-RefSeq",
      "VEP-RefSeq",
      "enhancer",
    ]);
  });

  const response = {
    gene_list: ["GENEA", "GENED"],
    rsId_genes_map: { rs1: ["GENEA", "GENED"] },
    rsId_gene_sources: {
      // As returned for a run restricted to the enhancer column.
      rs1: {
        GENEA: ["enhancer_linked_genes"],
        GENED: ["enhancer_linked_genes"],
      },
    },
    panther_gene_info: {
      "HUMAN|A": { PANTHER_ID: "HUMAN|A" },
      "HUMAN|D": { PANTHER_ID: "HUMAN|D" },
    },
    gene_panther_mapping: { GENEA: ["HUMAN|A"], GENED: ["HUMAN|D"] },
  } as unknown as GeneMappingDownloadData;

  it("adds a sources column to each mapping row", () => {
    const rows = createResultsTableData(response);
    expect(rows.map((row) => [row.PANTHER_ID, row.sources])).toEqual([
      ["HUMAN|A", ["enhancer"]],
      ["HUMAN|D", ["enhancer"]],
    ]);
    expect(
      Object.keys(createResultsTableData(response, ["HUMAN|A"], "GO:0008150")[0])
    ).toEqual([
      "rsId",
      "PANTHER_ID",
      "mappedGenes",
      "sources",
      "status",
      "GO_database_BP_complete",
    ]);
  });

  it("adds a sources column to the gene identifier report", () => {
    const report = {
      summary: {},
      variants: [],
      gene_identifiers: [
        {
          identifier: "GENEA",
          mapped_by_panther: "yes",
          panther_listed_as: "GENEA",
          panther_match: "exact",
        },
      ],
    } as unknown as InputReport;
    expect(createGeneIdentifierReportCsv(report, sources).split("\n")).toEqual([
      "identifier,mapped_by_panther,panther_listed_as,panther_match,sources",
      '"GENEA",yes,"GENEA",exact,"ANNOVAR-RefSeq;SnpEff-RefSeq;VEP-RefSeq;enhancer"',
      "",
    ]);
  });
});
