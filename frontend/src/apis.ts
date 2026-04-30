import { WorkflowOverrepresentationResponse } from "./models";

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

export const runWorkflowOverrepresentation = async (
  payload: any,
  annotDataSet: string,
  correction: string,
  enrichmentTestType: string
): Promise<WorkflowOverrepresentationResponse> => {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_BASE_URL ?? ""}/workflow/overrepresentation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        annotDataSet,
        correction,
        enrichmentTestType,
      }),
    }
  );

  return parseJsonResponse<WorkflowOverrepresentationResponse>(response);
};
