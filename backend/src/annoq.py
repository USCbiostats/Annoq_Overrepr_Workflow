from typing import Any
import requests
import pandas as pd
from src.gene_cols import GENE_COLS
from src.query import (
    InputType,
    ChromosomeQuery,
    GeneQuery,
    RsIdQuery,
    RsIdListQuery,
    IdsQuery,
    KeywordQuery,
)
from io import StringIO


def get_unique_gene_list(input_type: InputType, query: Any) -> list[str]:
    # Get the unique genes from the Annoq API
    es_query = create_es_query(input_type, query)
    download_url = get_download_url(es_query)
    df = download_data(download_url)

    unique_genes = extract_unique_genes(df)

    return unique_genes


def create_es_query(input_type: InputType, query: Any) -> Any:
    if input_type == InputType.chromosome:
        es_query = create_chromosome_query(query)
    elif input_type == InputType.gene:
        es_query = create_gene_query(query)
    elif input_type == InputType.rsId:
        es_query = create_rs_id_query(query)
    elif input_type == InputType.rsIdList:
        es_query = create_rs_id_list_query(query)
    elif input_type == InputType.ids:
        es_query = create_ids_query(query)
    elif input_type == InputType.keyword:
        es_query = create_keyword_query(query)
    else:
        raise ValueError("Invalid input type")

    return es_query


def _get_es_query_template() -> Any:
    return {
        "_source": [i[0] for i in GENE_COLS],
    }


def create_chromosome_query(query: ChromosomeQuery) -> Any:
    es_query = _get_es_query_template()

    es_query["query"] = {
        "bool": {
            "filter": [
                {
                    "term": {
                        "chr": query.chr,
                    }
                },
                {
                    "range": {
                        "pos": {
                            "gte": query.start,
                            "lte": query.end,
                        }
                    }
                },
            ],
        },
    }

    return es_query


def create_gene_query(query: GeneQuery) -> Any:
    pass


def create_rs_id_query(query: RsIdQuery) -> Any:
    es_query = _get_es_query_template()

    es_query["query"] = {"bool": {"filter": [{"term": {"rs_dbSNP151": query.rsId}}]}}

    return es_query


def create_rs_id_list_query(query: RsIdListQuery) -> Any:
    es_query = _get_es_query_template()

    es_query["query"] = {
        "bool": {"filter": [{"terms": {"rs_dbSNP151": query.rsIdList}}]}
    }

    return es_query


def create_ids_query(query: IdsQuery) -> Any:
    pass


def create_keyword_query(query: KeywordQuery) -> Any:
    pass


def extract_unique_genes(df: pd.DataFrame) -> list[str]:
    # Extract unique genes from the DataFrame
    # Use the gene columns defined in GENE_COLS
    gene_list = []

    for _, row in df.iterrows():
        snp_gene_list = []
        for gene_col, gene_extractor in GENE_COLS:
            snp_gene_list.extend(gene_extractor(row[gene_col]))
        gene_list.extend(list(set(snp_gene_list)))

    return gene_list


def get_download_url(es_query: Any) -> str:
    ANNOQ_DOWNLOAD_URL = "https://api.annoq.org/total_res"

    # Retrieve the download URL from the Annoq API
    try:
        response = requests.post(ANNOQ_DOWNLOAD_URL, json=es_query, verify=False)
        response.raise_for_status()
        download_url = response.json()["url"]
        url_prefix = "https://api.annoq.org"
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
