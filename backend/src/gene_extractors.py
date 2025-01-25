import re
# List of gene extraction functions

def ensemble_gene_extractor(gene_str: str) -> list[str]:
    # Extract gene names from the gene string
    # The gene string is in the format: "ENSG00000139618,ENSG00000139618"
    # The delimiter can be anything
    # We will use regex to extract the gene names

    gene_names = re.findall(r"ENSG\d+", gene_str)
    return gene_names