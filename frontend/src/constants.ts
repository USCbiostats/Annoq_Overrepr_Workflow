export enum InputTypes {
    CHROMOSOME =  "chromosome",
    RSIDS = "rsIdList",
    VCF = "vcf"
}

export enum TestType {
    FISHER = "FISHER",
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
        "value": "GO:0008150"
    },
    {
        "name": "GO molecular function complete",
        "value": "GO:0003674"
    },
    {
        "name": "GO cellular component complete",
        "value": "GO:0005575"
    },
    {
        "name": "PANTHER pathways",
        "value": "ANNOT_TYPE_ID_PANTHER_PATHWAY"
    },
    {
        "name": "PANTHER GO-Slim Molecular Function",
        "value": "ANNOT_TYPE_ID_PANTHER_GO_SLIM_MF"
    },
    {
        "name": "PANTHER GO-Slim Biological Process",
        "value": "ANNOT_TYPE_ID_PANTHER_GO_SLIM_BP"
    },
    {
        "name": "PANTHER GO-Slim Cellular Component",
        "value": "ANNOT_TYPE_ID_PANTHER_GO_SLIM_CC"
    },
    {
        "name": "PANTHER Protein Class",
        "value": "ANNOT_TYPE_ID_PANTHER_PC"
    },
    {
        "name": "Reactome pathways",
        "value": "ANNOT_TYPE_ID_REACTOME_PATHWAY"
    }
]