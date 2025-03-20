import json
from io import StringIO
from typing import Any

import pandas as pd
import requests

from src.gene_cols import GENE_COLS
from src.query import (
    ChromosomeQuery,
    GeneQuery,
    IdsQuery,
    InputType,
    KeywordQuery,
    RsIdListQuery,
    RsIdQuery,
)


def get_annoq_df(input_type: InputType, query: Any) -> pd.DataFrame:
    gql_query = create_gql_query(input_type, query)
    download_url = get_download_url(gql_query)
    df = download_data(download_url)

    # Empty cells in the df have the string "."
    # Replace them with the empty string
    df.replace(".", "", inplace=True)

    return df


def get_unique_gene_list(annoq_df: pd.DataFrame) -> list[list[str]]:
    unique_genes = extract_unique_genes(annoq_df)

    return unique_genes


def create_gql_query(input_type: InputType, query: Any) -> Any:
    if input_type == InputType.chromosome:
        gql_query = create_chromosome_query(query)
    elif input_type == InputType.gene:
        gql_query = create_gene_query(query)
    elif input_type == InputType.rsId:
        gql_query = create_rs_id_query(query)
    elif input_type == InputType.rsIdList:
        gql_query = create_rs_id_list_query(query)
    elif input_type == InputType.ids:
        gql_query = create_ids_query(query)
    elif input_type == InputType.keyword:
        gql_query = create_keyword_query(query)
    else:
        raise ValueError("Invalid input type")

    return gql_query


def _get_query_fields() -> list[str]:
    return [i[0] for i in (GENE_COLS + [("rs_dbSNP151",)])]


def generate_gql_download_query(
    function_name: str, filter_fields: dict[str, Any]
) -> str:
    params = {
        "fields": _get_query_fields(),
        **filter_fields,
    }

    params_str = ",".join(
        [f"{key}: {json.dumps(value)}" for key, value in params.items()]
    )

    # Generate the GraphQL query string
    query_string = f"""
    query {{
        download: {function_name}({params_str})
    }}
    """
    return query_string


def create_chromosome_query(query: ChromosomeQuery) -> Any:
    filter_fields = {
        "chr": query.chr,
        "start": query.start,
        "end": query.end,
    }

    return generate_gql_download_query("download_SNPs_by_chromosome", filter_fields)


def create_gene_query(query: GeneQuery) -> Any:
    pass


def create_rs_id_query(query: RsIdQuery) -> Any:
    filter_fields = {
        "rsID": query.rsId,
    }

    return generate_gql_download_query("download_SNPs_by_RsID", filter_fields)


def create_rs_id_list_query(query: RsIdListQuery) -> Any:
    filter_fields = {
        "rsIDs": query.rsIdList,
    }
    return generate_gql_download_query("download_SNPs_by_RsIDs", filter_fields)


def create_ids_query(query: IdsQuery) -> Any:
    pass


def create_keyword_query(query: KeywordQuery) -> Any:
    pass


def extract_unique_genes(df: pd.DataFrame) -> list[list[str]]:
    # Extract unique genes from the DataFrame
    # Use the gene columns defined in GENE_COLS
    gene_lists: list[set[str]] = [set() for i in range(len(GENE_COLS))]

    for _, row in df.iterrows():
        for idx, (gene_col, gene_extractor) in enumerate(GENE_COLS):
            genes = gene_extractor(row[gene_col])

            # Add the genes to the set
            gene_lists[idx].update(genes)

    # Convert the set to a list
    return [list(gene_list) for gene_list in gene_lists]


def get_download_url(gql_query: str) -> str:
    ANNOQ_GQL_URL = "https://api-v2.annoq.org/graphql"

    headers = {"Content-Type": "application/json"}
    # Retrieve the download URL from the Annoq API
    try:
        response = requests.post(
            ANNOQ_GQL_URL, json={"query": gql_query}, headers=headers, verify=False
        )
        response.raise_for_status()
        download_url = response.json()["data"]["download"]
        url_prefix = "https://api-v2.annoq.org/download"
        download_url = f"{url_prefix}{download_url}"
        return download_url
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise Exception("Failed to retrieve download URL")


def download_data(download_url: str) -> pd.DataFrame:
    # Download the data from url
    # The download URL is a direct link to the text file in CSV format
    # Load the data into a pandas DataFrame

    try:
        # Download file using requests library
        file = requests.get(download_url, verify=False)
        file.raise_for_status()

        # Load the data into a pandas DataFrame

        # Use the first row as the header
        # Use tab as the separator
        buffer = StringIO(file.text)
        return pd.read_csv(buffer, sep="\t", header=0)
    except Exception as e:
        print(f"Error: {e}")
        raise Exception("Failed to download data")
