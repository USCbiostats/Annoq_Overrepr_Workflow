import { GeneMappingResponse, PantherGeneInfoResponse } from "./models";

export const MAX_OVERREP_GENE_COUNT = 100000;

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.detail) {
        detail = String(errorData.detail);
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
};

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
  return parseJsonResponse<GeneMappingResponse>(response);
};

export const getPantherGeneInfo = async (
  geneList: string[]
): Promise<PantherGeneInfoResponse> => {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_BASE_URL ?? ""}/panther_gene_info`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gene_list: geneList }),
    }
  );

  return parseJsonResponse<PantherGeneInfoResponse>(response);
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
  return parseJsonResponse<any>(response);
};
