from enum import Enum
from typing import Any
import requests

class OverRepresentationTestType(Enum):
    FISHER = "FISCHER"
    BINOMIAL = "BINOMIAL"

class OverRepresentationTestCorrectionType(Enum):
    BONFERRONI = "BONFERRONI"
    FDR = "FDR"
    NONE = "NONE"

def overrepr_test(
    geneInputList: list[str],
    organism: str,
    annotDataSet: str,
    refOrganism: str | None,
    refInputList: list[str] | None,
    enrichmentTestType: OverRepresentationTestType,
    correction: OverRepresentationTestCorrectionType,
) -> Any:
    # Perform over-representation analysis
    
    URL = "https://www.pantherdb.org/services/oai/pantherdb/enrich/overrep"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}

    params = {
        "geneInputList": ",".join(geneInputList),
        "organism": organism,
        "annotDataSet": annotDataSet,
        "enrichmentTestType": enrichmentTestType.value,
        "correction": correction.value,
    }


    if refOrganism:
        params["refOrganism"] = refOrganism
    
    if refInputList:
        params["refInputList"] = ",".join(refInputList)
    
    try:
        # Send the above params as query parameters to the PANTHER API instead of the body
        response = requests.post(URL, data=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise Exception("Failed to perform over-representation analysis")