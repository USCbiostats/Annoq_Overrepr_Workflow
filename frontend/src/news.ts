// SNPWay release history, shown on the News page (/news), newest first.
// Add an entry here for each deployment, with the version set in
// backend/src/version.py.

export interface ReleaseSection {
  heading: string;
  items: string[];
}

export interface Release {
  date: string; // YYYY-MM-DD
  version: string;
  title: string;
  sections: ReleaseSection[];
  // A beta release (version X.Y.Z-beta.N). The news bar turns light yellow
  // with a BETA label while the latest release is a beta.
  beta?: boolean;
}

export const RELEASES: Release[] = [
  {
    date: "2026-11-04",
    version: "2.0.0-beta.1",
    beta: true,
    title: "Beta: SNPWay on TOPMed Freeze 8 data (GRCh38/hg38)",
    sections: [
      {
        heading: "Beta release on TOPMed data",
        items: [
          "This is a beta release of SNPWay that maps SNPs through the AnnoQ TOPMed Freeze 8 dataset (https://topmed.annoq.org), which is based on GRCh38/hg38.",
          "VCF input is matched to AnnoQ by chromosome and position, so positions must be GRCh38/hg38. rsIDs are matched against dbSNP build 155.",
          "Results can differ from those of SNPWay on the HRC dataset (GRCh37/hg19), which remains available at https://snpway.annoq.org.",
          "Features may change before the final release. Please report problems to the AnnoQ team.",
        ],
      },
    ],
  },
  {
    date: "2026-11-04",
    version: "1.1.0",
    title: "Annotation tool selection and custom reference lists",
    sections: [
      {
        heading: "SNP to gene mapping",
        items: [
          "Option to choose the annotation tools used to map SNPs to genes: ANNOVAR, SnpEff and VEP (Ensembl or RefSeq gene models) and PEREGRINE enhancer-gene links. The default is the union of all seven sources.",
          "Intergenic variants fall back to ANNOVAR's closest genes when the selected ANNOVAR gene model assigns no gene.",
          "Improved extraction of RefSeq gene names.",
        ],
      },
      {
        heading: "Reference list",
        items: [
          "Option to use a custom reference list in place of PANTHER's default of all human genes.",
          "The reference list can be a VCF file, an rsID list or a gene list. VCF and rsID reference lists are mapped to genes like the input, with their own choice of annotation tools.",
        ],
      },
      {
        heading: "Input form",
        items: [
          "The input form is organized into steps, with tips for each option.",
          "Progress is shown for each stage of a run.",
          "Retrieving SNPs by chromosome range has been removed.",
        ],
      },
      {
        heading: "Results and downloads",
        items: [
          "Input Variant Report: the status of every submitted variant (annotated, no record in AnnoQ, or no gene from the selected sources).",
          "Gene Identifier Report: whether PANTHER mapped each gene identifier.",
          "Mapping downloads list the annotation sources behind each variant-gene assignment.",
          "Every download starts with the versions behind the run (SNPWay, AnnoQ, genome build, dbSNP, annotation tools, PANTHER) and the analysis settings.",
          "A warning is shown when p-values are not corrected for multiple testing.",
          "PANTHER's UNCLASSIFIED category is left out of significant results.",
        ],
      },
    ],
  },
  {
    date: "2026-04-30",
    version: "1.0.1",
    title: "Site redesign and REST API",
    sections: [
      {
        heading: "Site",
        items: [
          "Redesigned site with new Tutorial and API Guide pages.",
        ],
      },
      {
        heading: "Input",
        items: [
          "VCF input is matched to AnnoQ by chromosome and position.",
          "Large inputs are sent to AnnoQ in batches.",
        ],
      },
      {
        heading: "API",
        items: [
          "Gene mapping and overrepresentation are available as REST API endpoints, used by the AnnoQR package.",
        ],
      },
    ],
  },
  {
    date: "2025-04-30",
    version: "1.0.0",
    title: "Initial release",
    sections: [
      {
        heading: "Features",
        items: [
          "Map SNPs from a VCF file, an rsID list or a chromosome range to genes through AnnoQ.",
          "Run a PANTHER overrepresentation test on the resulting genes against GO, PANTHER and Reactome annotation data sets.",
          "Fisher's exact or binomial test, with FDR, Bonferroni or no correction.",
          "Sortable results table, with downloads of all mappings, significant mappings, or a single category.",
        ],
      },
    ],
  },
];

export const LATEST_RELEASE = RELEASES[0];

// News bar colours. A beta release gets the light yellow AnnoQ TOPMed uses for
// its menu bar (#fff3cd), as a warning that this is a beta on a different
// dataset from the HRC SNPWay.
export function newsBarStyle(release: Pick<Release, "beta">) {
  return release.beta
    ? { bgcolor: "#fff3cd", borderColor: "#e9bd30", showBeta: true }
    : { bgcolor: "#e8eff7", borderColor: "divider", showBeta: false };
}
