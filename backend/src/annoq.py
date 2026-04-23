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

DNA_BASES = ("A", "C", "G", "T")
ANNOQ_IDS_BATCH_SIZE = 50000


def _chunk_items(items: list[str], chunk_size: int) -> list[list[str]]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


async def _get_annoq_df_for_ids_query(query: IdsQuery) -> pd.DataFrame:
    expanded_ids = _expand_ids_for_annoq(query.ids)
    if not expanded_ids:
        return pd.DataFrame()

    id_batches = _chunk_items(expanded_ids, ANNOQ_IDS_BATCH_SIZE)
    batch_dfs: list[pd.DataFrame] = []

    for batch_index, batch_ids in enumerate(id_batches, start=1):
        gql_query = generate_gql_download_query(
            "download_SNPs_by_IDs",
            {"ids": batch_ids},
        )
        try:
            download_url = await get_download_url(gql_query)
            batch_df = await download_data(download_url)
            batch_dfs.append(batch_df)
        except Exception as exc:
            raise Exception(
                "Failed to retrieve AnnoQ data for ids batch "
                f"{batch_index}/{len(id_batches)} (size={len(batch_ids)}): {exc}"
            ) from exc

    merged_df = pd.concat(batch_dfs, ignore_index=True)
    merged_df.replace(".", "", inplace=True)
    return merged_df


async def get_annoq_df(input_type: InputType, query: Any) -> pd.DataFrame:
    if input_type == InputType.ids:
        if not isinstance(query, IdsQuery):
            raise ValueError("Ids query payload is missing or invalid")
        return await _get_annoq_df_for_ids_query(query)

    gql_query = create_gql_query(input_type, query)
    download_url = await get_download_url(gql_query)
    df = await download_data(download_url)

    # Empty cells in the df have the string "."
    # Replace them with the empty string
    df.replace(".", "", inplace=True)

    return df


def _normalize_chr_label(raw_chr: Any) -> str:
    value = str(raw_chr).strip()
    if not value:
        return ""
    value = value.replace("CHR", "chr").replace("Chr", "chr")
    if value.lower().startswith("chr"):
        suffix = value[3:].strip()
        return f"chr{suffix}" if suffix else ""
    return f"chr{value}"


def _variant_id_to_chr_pos(variant_id: str) -> str:
    text = variant_id.strip()
    if not text or ":" not in text:
        return ""
    chrom, rest = text.split(":", 1)
    position_chars: list[str] = []
    for ch in rest:
        if ch.isdigit():
            position_chars.append(ch)
        else:
            break
    position = "".join(position_chars)
    normalized_chr = _normalize_chr_label(chrom)
    if not normalized_chr or not position:
        return ""
    return f"{normalized_chr}:{position}"


def _row_to_chr_pos(row: pd.Series) -> str:
    if "chr" not in row or "pos" not in row:
        return ""

    chrom = _normalize_chr_label(row["chr"])
    pos = str(row["pos"]).strip()
    if pos.endswith(".0"):
        pos = pos[:-2]

    if not chrom or not pos:
        return ""
    return f"{chrom}:{pos}"


def _is_chr_pos_only_id(raw_id: str) -> bool:
    text = raw_id.strip()
    if not text or ":" not in text:
        return False

    _, rest = text.split(":", 1)
    return rest.isdigit()


def _chr_pos_to_annoq_variant_ids(chr_pos_id: str) -> list[str]:
    text = chr_pos_id.strip()
    if not _is_chr_pos_only_id(text):
        return []

    chrom, position = text.split(":", 1)
    normalized_chr = _normalize_chr_label(chrom)
    if not normalized_chr:
        return []

    # AnnoQ IDs use chromosome without the "chr" prefix.
    annoq_chr = normalized_chr[3:]

    return [
        f"{annoq_chr}:{position}{ref}>{alt}"
        for ref in DNA_BASES
        for alt in DNA_BASES
    ]


def _expand_ids_for_annoq(raw_ids: list[str]) -> list[str]:
    expanded: list[str] = []
    seen: set[str] = set()

    for raw_id in raw_ids:
        text = str(raw_id).strip()
        if not text:
            continue

        candidates = (
            _chr_pos_to_annoq_variant_ids(text)
            if _is_chr_pos_only_id(text)
            else [text]
        )

        for candidate in candidates:
            if candidate in seen:
                continue
            seen.add(candidate)
            expanded.append(candidate)

    return expanded


def get_rsid_gene_mapping(
    annoq_df: pd.DataFrame,
    force_chr_pos_keys: bool = False,
) -> dict[str, list[str]]:
    gemap: dict[str, list[str]] = {}
    for _, row in annoq_df.iterrows():
        key = ""
        if force_chr_pos_keys:
            key = _row_to_chr_pos(row)
        else:
            # Get the rsID
            key = str(row["rs_dbSNP151"]).strip()

        if not key:
            continue

        # Get the genes
        genes: list[str] = []
        for gene_col, gene_extractor in GENE_COLS:
            single_type_genes = gene_extractor(row[gene_col])

            # Add the genes to the set
            genes.extend(single_type_genes)

        # Remove empty strings
        genes = [gene.strip() for gene in genes if len(gene.strip()) > 0]
        if not genes:
            continue

        # Add the key and genes to the mapping dictionary
        if key in gemap:
            merged = set(gemap[key])
            merged.update(genes)
            gemap[key] = list(merged)
        else:
            gemap[key] = list(set(genes))
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
    return ["chr", "pos"] + [i[0] for i in (GENE_COLS + [("rs_dbSNP151",)])]


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
    normalized_chr = str(query.chr).strip()
    if normalized_chr.lower().startswith("chr"):
        normalized_chr = normalized_chr[3:]

    filter_fields = {
        "chr": normalized_chr,
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
    filter_fields = {
        "ids": _expand_ids_for_annoq(query.ids),
    }
    return generate_gql_download_query("download_SNPs_by_IDs", filter_fields)


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
