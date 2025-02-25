export enum InputTypes {
    CHROMOSOME =  "chromosome",
    RSIDS = "rsIdList",
    VCF = "vcf"
}

export enum TestType {
    FISCHER = "FISCHER",
    BINOMIAL = "BINOMIAL"
}

export enum CorrectionType {
    BONFERRONI =  "BONFERRONI",
    FDR = "FDR",
    NONE = "NONE"
}

export const Datasets = [
    {
        "name": "GO biological process complete",
        "value": "fullgo_bp_comp"
    },
    {
        "name": "GO molecular function complete",
        "value": "fullgo_mf_comp"
    },
    {
        "name": "GO cellular component complete",
        "value": "fullgo_cc_comp"
    },
    {
        "name": "PANTHER pathways",
        "value": "pathway"
    },
    {
        "name": "PANTHER GO-Slim Molecular Function",
        "value": "panther_mf"
    },
    {
        "name": "PANTHER GO-Slim Biological Process",
        "value": "panther_bp"
    },
    {
        "name": "PANTHER GO-Slim Cellular Component",
        "value": "panther_cc"
    },
    {
        "name": "PANTHER Protein Class",
        "value": "panther_pc"
    },
    {
        "name": "Reactome pathways",
        "value": "reactome"
    }
]