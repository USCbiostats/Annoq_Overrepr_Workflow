# List of gene extractors
import re


def delimited_gene_extractor(gene_str: str, delimiter: str) -> list[str]:
    # Extract gene names from the gene string
    # Split the string by the delimiter
    gene_list = gene_str.split(delimiter)
    # Remove empty strings
    gene_list = [gene for gene in gene_list if len(gene.strip()) > 0]
    return gene_list


def extract_refseq_gene_ids(gene_str: str) -> list[str]:
    if not gene_str or gene_str.lower() == "nan":
        return []
    entry = re.sub(r"^CHR_START-?", "", gene_str)
    sub_entries = re.split(r"[|,]", entry)
    final_genes = []
    for sub in sub_entries:
        if "NONE" in sub.upper():
            continue
        sub = sub.split(":")[0]
        parts = sub.split("-")
        current = parts[0]
        for i in range(1, len(parts)):
            if current[-1].isdigit() and parts[i][0].isdigit():
                current += "-" + parts[i]
            elif re.match(r"AS\d+", parts[i]):
                current += "-" + parts[i]
            else:
                final_genes.append(current)
                current = parts[i]
        final_genes.append(current)
    return [g for g in final_genes if g]


def extract_ensembl_gene_ids(gene_str: str) -> list[str]:
    pattern = re.compile(r"ENSG\d+", re.IGNORECASE)
    return pattern.findall(gene_str)
