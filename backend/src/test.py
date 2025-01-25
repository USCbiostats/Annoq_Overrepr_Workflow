import json

from src.annoq import get_unique_gene_list

JSON_STRING = """
{"_source":["chr","pos","ref","alt","rs_dbSNP151","ANNOVAR_ensembl_Gene_ID"],"aggs":{"chr":{"filter":{"exists":{"field":"chr"}}},"pos_min":{"min":{"field":"pos"}},"pos_max":{"max":{"field":"pos"}},"pos":{"filter":{"exists":{"field":"pos"}}},"ref":{"filter":{"exists":{"field":"ref"}}},"alt":{"filter":{"exists":{"field":"alt"}}},"rs_dbSNP151":{"filter":{"exists":{"field":"rs_dbSNP151"}}},"ANNOVAR_ensembl_Gene_ID":{"filter":{"exists":{"field":"ANNOVAR_ensembl_Gene_ID"}}}},"query":{"bool":{"filter":[{"term":{"chr":"18"}},{"range":{"pos":{"gte":1,"lte":500000}}}]}},"from":0,"size":50}
"""

ES_QUERY = json.loads(JSON_STRING)

ulist = get_unique_gene_list(ES_QUERY)

print("Retrieved unique genes...")

print("Running Over-representation analysis...")

from src.panther import (
    OverRepresentationTestType,
    OverRepresentationTestCorrectionType,
    overrepr_test,
)

result = overrepr_test(
    geneInputList=ulist[:6000],
    organism="9606",
    annotDataSet="GO:0008150",
    refOrganism=None,
    refInputList=None,
    enrichmentTestType=OverRepresentationTestType.FISHER,
    correction=OverRepresentationTestCorrectionType.FDR,
)

print(result)
