from typing import Tuple

import httpx

from src.models import GeneInfo


PANTHER_GENEINFO_BATCH_SIZE = 1000


async def get_panther_info(
    gene_list: list[str],
) -> Tuple[dict[str, GeneInfo], dict[str, list[str]]]:
    """
    Get PANTHER information for a list of genes.

    Args:
        gene_list: List of genes to get information for.

    Returns:
        A tuple of (panther_gene_info, gene_panther_mapping).
    """
    panther_gene_info: dict[str, GeneInfo] = {}
    gene_panther_mapping: dict[str, list[str]] = {}

    if not gene_list:
        return panther_gene_info, gene_panther_mapping

    async with httpx.AsyncClient() as client:
        for start in range(0, len(gene_list), PANTHER_GENEINFO_BATCH_SIZE):
            batch_index = (start // PANTHER_GENEINFO_BATCH_SIZE) + 1
            chunk = gene_list[start : start + PANTHER_GENEINFO_BATCH_SIZE]
            gene_input_list = ",".join(chunk)

            try:
                response = await client.post(
                    "https://pantherdb.org/services/oai/pantherdb/geneinfo",
                    data={"geneInputList": gene_input_list, "organism": "9606"},
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise RuntimeError(
                    "Failed to fetch PANTHER geneinfo for "
                    f"batch {batch_index} ({len(chunk)} genes): {exc}"
                ) from exc

            data = response.json()
            _merge_panther_response(
                data=data,
                panther_gene_info=panther_gene_info,
                gene_panther_mapping=gene_panther_mapping,
            )

    return panther_gene_info, gene_panther_mapping


def _merge_panther_response(
    data: dict,
    panther_gene_info: dict[str, GeneInfo],
    gene_panther_mapping: dict[str, list[str]],
) -> None:
    """Merge one PANTHER geneinfo payload into shared response dictionaries."""

    # Check if there are mapped genes in the response
    if (
        "search" in data
        and "mapped_genes" in data["search"]
        and "gene" in data["search"]["mapped_genes"]
    ):
        mapped_genes: list[dict] = data["search"]["mapped_genes"]["gene"]

        if not mapped_genes:
            return

        if not isinstance(mapped_genes, list):
            mapped_genes = [mapped_genes]

        # Process each mapped gene
        for gene_data in mapped_genes:
            panther_id = gene_data.get("accession", "")
            mapped_id_list = str(gene_data.get("mapped_id_list", "")).split(",")

            # Create GeneInfo object
            gene_info = GeneInfo(
                PANTHER_ID=panther_id,
                PANTHER_family=gene_data.get("family_name", ""),
                PANTHER_Subfamily=gene_data.get("sf_name", ""),
                PANTHER_Pathway="",
                Protein_Class="",
                Reactome_Pathway="",
                GO_database_MF_complete="",
                GO_database_BP_complete="",
                GO_database_CC_complete="",
                PANTHER_GO_slim_Molecular_Function="",
                PANTHER_GO_slim_Biological_Process="",
                PANTHER_GO_slim_Cellular_Component="",
            )

            # Extract annotations from annotation_type_list
            if (
                "annotation_type_list" in gene_data
                and "annotation_data_type" in gene_data["annotation_type_list"]
            ):
                annotation_data_type = gene_data["annotation_type_list"][
                    "annotation_data_type"
                ]

                if not isinstance(annotation_data_type, list):
                    annotation_data_type = [annotation_data_type]

                for annotation_type in annotation_data_type:
                    content = annotation_type.get("content", "")

                    # Extract annotations based on content type
                    if content == "ANNOT_TYPE_ID_PANTHER_PATHWAY":
                        gene_info.PANTHER_Pathway = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "ANNOT_TYPE_ID_PANTHER_PC":
                        gene_info.Protein_Class = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "ANNOT_TYPE_ID_REACTOME_PATHWAY":
                        gene_info.Reactome_Pathway = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "GO:0003674":  # Molecular Function
                        gene_info.GO_database_MF_complete = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "GO:0008150":  # Biological Process
                        gene_info.GO_database_BP_complete = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "GO:0005575":  # Cellular Component
                        gene_info.GO_database_CC_complete = _extract_annotation_names(
                            annotation_type
                        )
                    elif content == "ANNOT_TYPE_ID_PANTHER_GO_SLIM_MF":
                        gene_info.PANTHER_GO_slim_Molecular_Function = (
                            _extract_annotation_names(annotation_type)
                        )
                    elif content == "ANNOT_TYPE_ID_PANTHER_GO_SLIM_BP":
                        gene_info.PANTHER_GO_slim_Biological_Process = (
                            _extract_annotation_names(annotation_type)
                        )
                    elif content == "ANNOT_TYPE_ID_PANTHER_GO_SLIM_CC":
                        gene_info.PANTHER_GO_slim_Cellular_Component = (
                            _extract_annotation_names(annotation_type)
                        )

            # Add to panther_gene_info
            panther_gene_info[panther_id] = gene_info

            # Add to gene_panther_mapping
            for gene_id in mapped_id_list:
                gene_id = gene_id.strip()
                if gene_id not in gene_panther_mapping:
                    gene_panther_mapping[gene_id] = []
                if panther_id and panther_id not in gene_panther_mapping[gene_id]:
                    gene_panther_mapping[gene_id].append(panther_id)


def _extract_annotation_ids(annotation_type: dict) -> str:
    """Extract annotation IDs from an annotation type."""
    if (
        "annotation_list" in annotation_type
        and "annotation" in annotation_type["annotation_list"]
    ):
        annotation = annotation_type["annotation_list"]["annotation"]
        if isinstance(annotation, list):
            return ";".join([ann.get("id", "") for ann in annotation if "id" in ann])
        elif isinstance(annotation, dict) and "id" in annotation:
            return annotation["id"]
    return ""


def _extract_annotation_names(annotation_type: dict) -> str:
    """Extract annotation names from an annotation type."""
    if (
        "annotation_list" in annotation_type
        and "annotation" in annotation_type["annotation_list"]
    ):
        annotation = annotation_type["annotation_list"]["annotation"]
        if isinstance(annotation, list):
            return ";".join(
                [ann.get("name", "") for ann in annotation if "name" in ann]
            )
        elif isinstance(annotation, dict) and "name" in annotation:
            return annotation["name"]
    return ""
