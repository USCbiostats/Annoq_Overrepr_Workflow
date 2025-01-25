# Create a basic fastapi server

from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware

from src.annoq import get_unique_gene_list
from src.panther import (
    OverRepresentationTestType,
    OverRepresentationTestCorrectionType,
    overrepr_test,
)
from src.query import (
    InputType,
    ChromosomeQuery,
    RsIdQuery,
    RsIdListQuery,
    IdsQuery,
    GeneQuery,
    KeywordQuery,
)

from typing import Annotated

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/overrepr_test")
def overrepresentation_test(
    organism: Annotated[str, Body(...)],
    annotDataSet: Annotated[str, Body(...)],
    input_type: Annotated[InputType, Body(...)],
    chrQuery: ChromosomeQuery | None = None,
    rsIdQuery: RsIdQuery | None = None,
    rsIdListQuery: RsIdListQuery | None = None,
    idsQuery: IdsQuery | None = None,
    geneQuery: GeneQuery | None = None,
    keywordQuery: KeywordQuery | None = None,
    refOrganism: Annotated[str | None, Body(...)] = None,
    refInputList: list[str] | None = None,
    enrichmentTestType: Annotated[
        OverRepresentationTestType, Body(...)
    ] = OverRepresentationTestType.FISHER,
    correction: Annotated[
        OverRepresentationTestCorrectionType, Body(...)
    ] = OverRepresentationTestCorrectionType.FDR,
):
    query = None
    if input_type == InputType.chromosome:
        query = chrQuery
    elif input_type == InputType.rsId:
        query = rsIdQuery
    elif input_type == InputType.rsIdList:
        query = rsIdListQuery
    elif input_type == InputType.ids:
        query = idsQuery
    elif input_type == InputType.gene:
        query = geneQuery
    elif input_type == InputType.keyword:
        query = keywordQuery

    try:
        gene_list = get_unique_gene_list(input_type, query)
        result = overrepr_test(
            geneInputList=gene_list,
            organism=organism,
            annotDataSet=annotDataSet,
            refOrganism=refOrganism,
            refInputList=refInputList,
            enrichmentTestType=enrichmentTestType,
            correction=correction,
        )

        return result

    except Exception as e:
        return {"error": str(e)}


# Add the build folder that contains the react app
app.mount("/", StaticFiles(directory="dist", html=True))