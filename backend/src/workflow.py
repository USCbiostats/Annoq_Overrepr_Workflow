from __future__ import annotations

from typing import Any

import httpx

from src.models import OverrepresentationResultItem

PANTHER_OVERREP_URL = "https://pantherdb.org/services/oai/pantherdb/enrich/overrep"


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_sci_float(value: Any) -> float:
    return float(f"{_to_float(value):.2e}")


def _normalize_mapped_ids(raw_mapped_ids: Any) -> list[str]:
    if raw_mapped_ids is None:
        return []

    if isinstance(raw_mapped_ids, str):
        return [
            gene.strip() for gene in raw_mapped_ids.split(",") if gene and gene.strip()
        ]

    if isinstance(raw_mapped_ids, list):
        mapped_ids: list[str] = []
        for gene in raw_mapped_ids:
            normalized_gene = str(gene).strip()
            if normalized_gene:
                mapped_ids.append(normalized_gene)
        return mapped_ids

    return []


async def get_overrepresentation(
    gene_list: list[str],
    annot_data_set: str,
    correction: str,
    enrichment_test_type: str,
) -> dict[str, Any]:
    if not gene_list:
        return {"results": {"result": []}}

    payload = {
        "geneInputList": ",".join(gene_list),
        "annotDataSet": annot_data_set,
        "organism": "9606",
        "mappedInfo": "COMP_LIST",
        "correction": correction,
        "enrichmentTestType": enrichment_test_type,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                PANTHER_OVERREP_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = response.text if response is not None else str(exc)
            raise RuntimeError(
                "PANTHER overrepresentation request failed with "
                f"status {exc.response.status_code}: {message}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Failed to call PANTHER overrepresentation API: {exc}"
            ) from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(
            "PANTHER overrepresentation returned non-JSON response"
        ) from exc

    if isinstance(data, dict):
        search_block = data.get("search")
        if isinstance(search_block, dict) and search_block.get("error"):
            raise RuntimeError(
                f"PANTHER overrepresentation error: {search_block['error']}"
            )

    return data


def parse_overrepresentation_results(
    overrepresentation_data: dict[str, Any],
) -> list[OverrepresentationResultItem]:
    results = overrepresentation_data.get("results", {}).get("result", [])

    if isinstance(results, dict):
        results = [results]

    if not isinstance(results, list):
        return []

    normalized_results: list[OverrepresentationResultItem] = []

    for index, item in enumerate(results):
        if not isinstance(item, dict):
            continue

        term = item.get("term")
        if not isinstance(term, dict):
            term = {}

        process_name = str(term.get("label", "")).strip()
        if not process_name:
            process_name = f"Process {index + 1}"

        input_list = item.get("input_list")
        mapped_ids_raw = None
        if isinstance(input_list, dict):
            mapped_ids_raw = input_list.get("mapped_ids")

        normalized_results.append(
            OverrepresentationResultItem(
                termId=str(term.get("id", "")).strip(),
                process=process_name,
                refCount=_to_int(item.get("number_in_reference")),
                uploadCount=_to_int(item.get("number_in_list")),
                expected=round(_to_float(item.get("expected")), 2),
                foldEnrichment=round(_to_float(item.get("fold_enrichment")), 2),
                overUnder=str(item.get("plus_minus", "+") or "+"),
                pValue=_to_sci_float(item.get("pValue")),
                fdr=_to_sci_float(item.get("fdr")),
                mapped_ids=_normalize_mapped_ids(mapped_ids_raw),
            )
        )

    return normalized_results


def _get_relevant_columns(annotation_dataset: str | None) -> list[str]:
    base_columns = ["rsId", "PANTHER_ID", "mappedGenes"]

    all_columns = [
        *base_columns,
        "PANTHER_family",
        "PANTHER_Subfamily",
        "PANTHER_Pathway",
        "Protein_Class",
        "Reactome_Pathway",
        "GO_database_MF_complete",
        "GO_database_BP_complete",
        "GO_database_CC_complete",
        "PANTHER_GO_slim_Molecular_Function",
        "PANTHER_GO_slim_Biological_Process",
        "PANTHER_GO_slim_Cellular_Component",
    ]

    if annotation_dataset is None:
        return all_columns

    dataset_column_map = {
        "GO:0008150": [*base_columns, "GO_database_BP_complete"],
        "GO:0003674": [*base_columns, "GO_database_MF_complete"],
        "GO:0005575": [*base_columns, "GO_database_CC_complete"],
        "ANNOT_TYPE_ID_PANTHER_PATHWAY": [*base_columns, "PANTHER_Pathway"],
        "ANNOT_TYPE_ID_PANTHER_GO_SLIM_MF": [
            *base_columns,
            "PANTHER_GO_slim_Molecular_Function",
        ],
        "ANNOT_TYPE_ID_PANTHER_GO_SLIM_BP": [
            *base_columns,
            "PANTHER_GO_slim_Biological_Process",
        ],
        "ANNOT_TYPE_ID_PANTHER_GO_SLIM_CC": [
            *base_columns,
            "PANTHER_GO_slim_Cellular_Component",
        ],
        "ANNOT_TYPE_ID_PANTHER_PC": [*base_columns, "Protein_Class"],
        "ANNOT_TYPE_ID_REACTOME_PATHWAY": [*base_columns, "Reactome_Pathway"],
    }

    return dataset_column_map.get(annotation_dataset, all_columns)


