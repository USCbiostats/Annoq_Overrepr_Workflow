export enum InputTypes {
    RSIDS = "rsIdList",
    VCF = "vcf",
    // Reference list only: gene IDs sent to PANTHER without AnnoQ mapping.
    GENES = "geneList"
}

// AnnoQ gene columns used to map SNPs to genes. Values must match the backend.
export enum GeneMappingField {
    ANNOVAR_ENSEMBL = "ANNOVAR_ensembl_Gene_ID",
    ANNOVAR_REFSEQ = "ANNOVAR_refseq_Gene_ID",
    SNPEFF_ENSEMBL = "SnpEff_ensembl_Gene_ID",
    SNPEFF_REFSEQ = "SnpEff_refseq_Gene_ID",
    VEP_ENSEMBL = "VEP_ensembl_Gene_ID",
    VEP_REFSEQ = "VEP_refseq_Gene_Name",
    ENHANCER_LINKED_GENES = "enhancer_linked_genes"
}

export type GeneMappingTool = {
    label: string;
    // Categories with sub-options list them here; single-field categories use `field`.
    ensembl?: GeneMappingField;
    refseq?: GeneMappingField;
    field?: GeneMappingField;
}

export const GENE_MAPPING_TOOLS: GeneMappingTool[] = [
    {
        label: "ANNOVAR",
        ensembl: GeneMappingField.ANNOVAR_ENSEMBL,
        refseq: GeneMappingField.ANNOVAR_REFSEQ
    },
    {
        label: "SnpEff",
        ensembl: GeneMappingField.SNPEFF_ENSEMBL,
        refseq: GeneMappingField.SNPEFF_REFSEQ
    },
    {
        label: "VEP",
        ensembl: GeneMappingField.VEP_ENSEMBL,
        refseq: GeneMappingField.VEP_REFSEQ
    },
    {
        label: "PEREGRINE enhancer linked genes",
        field: GeneMappingField.ENHANCER_LINKED_GENES
    }
]

export const ALL_GENE_MAPPING_FIELDS: GeneMappingField[] = Object.values(GeneMappingField);

// Source names used in the "sources" column of the downloads.
export const GENE_MAPPING_SOURCE_LABELS: Record<GeneMappingField, string> = {
    [GeneMappingField.ANNOVAR_ENSEMBL]: "ANNOVAR-Ensembl",
    [GeneMappingField.ANNOVAR_REFSEQ]: "ANNOVAR-RefSeq",
    [GeneMappingField.SNPEFF_ENSEMBL]: "SnpEff-Ensembl",
    [GeneMappingField.SNPEFF_REFSEQ]: "SnpEff-RefSeq",
    [GeneMappingField.VEP_ENSEMBL]: "VEP-Ensembl",
    [GeneMappingField.VEP_REFSEQ]: "VEP-RefSeq",
    [GeneMappingField.ENHANCER_LINKED_GENES]: "enhancer"
};

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