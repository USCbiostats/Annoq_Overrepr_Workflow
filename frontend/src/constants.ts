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

// AnnoQ closest-gene columns: the genes flanking an intergenic variant. Selecting an
// ANNOVAR gene model also uses its closest-gene column (backend gene_cols.py).
export const ANNOVAR_ENSEMBL_CLOSEST = "ANNOVAR_ensembl_Closest_gene";
export const ANNOVAR_REFSEQ_CLOSEST = "ANNOVAR_refseq_Closest_gene";

// AnnoQ gene columns behind each selectable source, in column order.
export const GENE_MAPPING_COLUMNS: Record<GeneMappingField, string[]> = {
    [GeneMappingField.ANNOVAR_ENSEMBL]: [GeneMappingField.ANNOVAR_ENSEMBL, ANNOVAR_ENSEMBL_CLOSEST],
    [GeneMappingField.ANNOVAR_REFSEQ]: [GeneMappingField.ANNOVAR_REFSEQ, ANNOVAR_REFSEQ_CLOSEST],
    [GeneMappingField.SNPEFF_ENSEMBL]: [GeneMappingField.SNPEFF_ENSEMBL],
    [GeneMappingField.SNPEFF_REFSEQ]: [GeneMappingField.SNPEFF_REFSEQ],
    [GeneMappingField.VEP_ENSEMBL]: [GeneMappingField.VEP_ENSEMBL],
    [GeneMappingField.VEP_REFSEQ]: [GeneMappingField.VEP_REFSEQ],
    [GeneMappingField.ENHANCER_LINKED_GENES]: [GeneMappingField.ENHANCER_LINKED_GENES]
};

export const ALL_GENE_COLUMNS: string[] = ALL_GENE_MAPPING_FIELDS.flatMap(
    (field) => GENE_MAPPING_COLUMNS[field]
);

// Source names used in the "sources" column of the downloads, by gene column.
export const GENE_MAPPING_SOURCE_LABELS: Record<string, string> = {
    [GeneMappingField.ANNOVAR_ENSEMBL]: "ANNOVAR-Ensembl",
    [ANNOVAR_ENSEMBL_CLOSEST]: "ANNOVAR-Ensembl-closest",
    [GeneMappingField.ANNOVAR_REFSEQ]: "ANNOVAR-RefSeq",
    [ANNOVAR_REFSEQ_CLOSEST]: "ANNOVAR-RefSeq-closest",
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