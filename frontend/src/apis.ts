import { GeneMappingResponse } from "./models";

export const getGeneMappings = async (
  payload: any
): Promise<GeneMappingResponse> => {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_BASE_URL ?? ""}/gene_mappings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  return await response.json();
};

export const getOverrepresentation = async (
  geneInputList: string,
  annotDataSet: string,
  correction: string,
  enrichmentTestType: string
): Promise<any> => {
  const payload = {
    geneInputList,
    annotDataSet,
    organism: "9606",
    mappedInfo: "COMP_LIST",
    correction,
    enrichmentTestType,
  };
  const response = await fetch(
    `https://pantherdb.org/services/oai/pantherdb/enrich/overrep`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload),
    }
  );
  return await response.json();
};
