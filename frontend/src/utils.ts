import {
    ALL_GENE_MAPPING_FIELDS,
    GENE_MAPPING_TOOLS,
    GeneMappingField,
    InputTypes
} from "./constants";

export const process_rsids = (idsText: string): Array<string> => {
    // The ids can be separated by commas, spaces or new lines.
    // We will split the text by commas, spaces and new lines.
    // Then we will filter out the empty strings.
    // Finally we will return the unique ids.

    const ids = idsText.split(/[\s,]+/).filter(id => id !== '');
    return [...new Set(ids)];
}

const normalizeChromosome = (rawChromosome: string): string => {
    const trimmed = rawChromosome.trim();
    if (!trimmed) return "";
    const withoutPrefix = trimmed.replace(/^chr/i, "");
    return withoutPrefix;
};

export const parseVcfToIds = (
    rawVcf: string
): { ids: string[]; invalidRows: number } => {
    const ids: string[] = [];
    let invalidRows = 0;

    for (const line of rawVcf.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        // Prefer tab parsing so empty fields are preserved.
        let chrom = "";
        let pos = "";

        const tabFields = trimmed.split("\t");
        if (tabFields.length >= 2) {
            // VCF columns: CHROM POS ...
            chrom = tabFields[0];
            pos = tabFields[1];
        } else {
            // Fallback for whitespace-separated rows (tabs replaced by spaces, etc.).
            const wsFields = trimmed.split(/\s+/);
            if (wsFields.length >= 2) {
                // CHROM POS ...
                chrom = wsFields[0];
                pos = wsFields[1];
            } else {
                invalidRows += 1;
                continue;
            }
        }

        const normalizedChrom = normalizeChromosome(chrom);
        const normalizedPos = pos.trim();

        if (
            !normalizedChrom ||
            !normalizedPos ||
            !/^\d+$/.test(normalizedPos)
        ) {
            invalidRows += 1;
            continue;
        }

        ids.push(`${normalizedChrom}:${normalizedPos}`);
    }

    return { ids, invalidRows };
};

export const SNP_LIST_PREVIEW_COUNT = 100;

export type SnpListSummary = {
    // Unique entries that will be submitted (VCF positions or rsIDs).
    count: number;
    // VCF rows skipped because they have no valid CHROM/POS.
    invalidRows: number;
    // First entries for display, with a "..." line when there are more.
    preview: string;
};

// Counts the entries in a SNP list and builds a short preview, so large
// uploads do not have to be rendered in full.
export const summarizeSnpList = (
    inputType: InputTypes,
    text: string,
    previewCount = SNP_LIST_PREVIEW_COUNT
): SnpListSummary => {
    if (inputType === InputTypes.VCF) {
        const { ids, invalidRows } = parseVcfToIds(text);
        const previewLines: string[] = [];
        let dataLines = 0;
        for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }
            dataLines += 1;
            if (previewLines.length < previewCount) {
                previewLines.push(line.replace(/\r$/, ""));
            }
        }
        const remaining = dataLines - previewLines.length;
        if (remaining > 0) {
            previewLines.push(`... (${remaining.toLocaleString()} more lines)`);
        }
        return {
            count: new Set(ids).size,
            invalidRows,
            preview: previewLines.join("\n"),
        };
    }

    const rsIds = process_rsids(text);
    const previewIds = rsIds.slice(0, previewCount);
    const remaining = rsIds.length - previewIds.length;
    if (remaining > 0) {
        previewIds.push(`... (${remaining.toLocaleString()} more rsIDs)`);
    }
    return { count: rsIds.length, invalidRows: 0, preview: previewIds.join("\n") };
};

export type SnpListPayload = {
    input_type: string;
    idsQuery?: { ids: string[] };
    rsIdListQuery?: { rsIdList: string[] };
    geneMappingFields: GeneMappingField[];
}

// Builds the backend payload for one SNP list. `listName` prefixes messages
// (e.g. "reference ") so the user knows which list has the problem.
export const buildSnpListPayload = (
    inputType: InputTypes,
    text: string,
    geneMappingFields: GeneMappingField[],
    listName = ""
): { payload: SnpListPayload; warning: string | null } => {
    if (inputType === InputTypes.VCF) {
        const { ids, invalidRows } = parseVcfToIds(text);
        const uniqueIds = Array.from(new Set(ids));

        if (uniqueIds.length === 0) {
            throw new Error(
                `No valid variants were found in the ${listName}VCF input. Make sure each row includes CHROM and POS.`
            );
        }

        return {
            payload: {
                input_type: "ids",
                idsQuery: { ids: uniqueIds },
                geneMappingFields,
            },
            warning:
                invalidRows > 0
                    ? `Skipped ${invalidRows} invalid ${listName}VCF row(s). Continue with ${uniqueIds.length} valid position(s).`
                    : null,
        };
    }

    const parsedRsids = process_rsids(text);
    if (parsedRsids.length === 0) {
        throw new Error(`No valid rsIDs were found in the ${listName}input.`);
    }

    return {
        payload: {
            input_type: inputType,
            rsIdListQuery: { rsIdList: parsedRsids },
            geneMappingFields,
        },
        warning: null,
    };
};

// Short human-readable description of a gene mapping tool selection,
// e.g. "ANNOVAR, VEP (Ensembl)".
export const describeGeneMappingFields = (
    fields: GeneMappingField[]
): string => {
    const selected = new Set(fields);
    if (selected.size === 0) {
        return "None selected";
    }
    if (ALL_GENE_MAPPING_FIELDS.every((field) => selected.has(field))) {
        return "All tools";
    }

    const parts: string[] = [];
    for (const tool of GENE_MAPPING_TOOLS) {
        if (tool.field) {
            if (selected.has(tool.field)) {
                parts.push(tool.label);
            }
            continue;
        }

        const hasEnsembl = tool.ensembl !== undefined && selected.has(tool.ensembl);
        const hasRefseq = tool.refseq !== undefined && selected.has(tool.refseq);
        if (hasEnsembl && hasRefseq) {
            parts.push(tool.label);
        } else if (hasEnsembl) {
            parts.push(`${tool.label} (Ensembl)`);
        } else if (hasRefseq) {
            parts.push(`${tool.label} (RefSeq)`);
        }
    }
    return parts.join(", ");
};
