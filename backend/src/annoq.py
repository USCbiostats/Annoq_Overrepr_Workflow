import json
from io import StringIO
from typing import Any

import httpx
import pandas as pd

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


async def get_annoq_df(input_type: InputType, query: Any) -> pd.DataFrame:
    gql_query = create_gql_query(input_type, query)
    download_url = await get_download_url(gql_query)
    df = await download_data(download_url)

    # Empty cells in the df have the string "."
    # Replace them with the empty string
    df.replace(".", "", inplace=True)

    return df


def get_rsid_gene_mapping(annoq_df: pd.DataFrame) -> dict[str, list[str]]:
    gemap: dict[str, list[str]] = {}
    for _, row in annoq_df.iterrows():
        # Get the rsID
        rsid = row["rs_dbSNP151"]
        # Get the genes
        genes: list[str] = []
        for idx, (gene_col, gene_extractor) in enumerate(GENE_COLS):
            single_type_genes = gene_extractor(row[gene_col])

            # Add the genes to the set
            genes.extend(single_type_genes)

        # Remove empty strings
        genes = [gene.strip() for gene in genes if len(gene.strip()) > 0]
        # Add the rsID and genes to the mapping dictionary
        gemap[rsid] = list(set(genes))
    return gemap


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


async def get_download_url(gql_query: str) -> str:
    ANNOQ_GQL_URL = "https://api-v2.annoq.org/graphql"

    headers = {"Content-Type": "application/json"}
    # Retrieve the download URL from the Annoq API
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                ANNOQ_GQL_URL, json={"query": gql_query}, headers=headers
            )
            response.raise_for_status()
            download_url = response.json()["data"]["download"]
            url_prefix = "https://api-v2.annoq.org/download"
            download_url = f"{url_prefix}{download_url}"
            return download_url
    except httpx.HTTPError as e:
        print(f"Error: {e}")
        raise Exception("Failed to retrieve download URL")


async def download_data(download_url: str) -> pd.DataFrame:
    # Download the data from url
    # The download URL is a direct link to the text file in CSV format
    # Load the data into a pandas DataFrame

    try:
        # Download file using httpx library
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(download_url)
            response.raise_for_status()

            # Load the data into a pandas DataFrame
            # Use the first row as the header
            # Use tab as the separator
            buffer = StringIO(response.text)
            return pd.read_csv(buffer, sep="\t", header=0)
    except Exception as e:
        print(f"Error: {e}")
        raise Exception("Failed to download data")
