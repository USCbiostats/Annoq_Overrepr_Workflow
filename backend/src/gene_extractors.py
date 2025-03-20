# List of gene extractors

def delimited_gene_extractor(gene_str: str, delimiter: str) -> list[str]:
    # Extract gene names from the gene string
    # Split the string by the delimiter
    gene_list = gene_str.split(delimiter)
    # Remove empty strings
    gene_list = [gene for gene in gene_list if len(gene.strip()) > 0]
    return gene_list