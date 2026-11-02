import { WorkflowStreamEvent } from "./models";

export const MAX_OVERREP_GENE_COUNT = 100000;

const throwResponseError = async (response: Response): Promise<never> => {
  let detail = `Request failed with status ${response.status}`;
  try {
    const errorData = await response.json();
    if (Array.isArray(errorData?.detail)) {
      // FastAPI validation errors are a list of {loc, msg} objects.
      detail = errorData.detail
        .map((item: { msg?: string }) => item?.msg ?? JSON.stringify(item))
        .join("; ");
    } else if (errorData?.detail) {
      detail = String(errorData.detail);
    }
  } catch {
    // Keep the default message when the body is not JSON.
  }
  throw new Error(detail);
};

// Runs the workflow through the streaming endpoint, calling onEvent for each
// progress, result, gene_details or error event as it arrives. Resolves when
// the server closes the stream; rejects on network errors or when aborted.
export const streamWorkflowOverrepresentation = async (
  payload: object,
  annotDataSet: string,
  correction: string,
  enrichmentTestType: string,
  onEvent: (event: WorkflowStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_BASE_URL ?? ""}/workflow/overrepresentation/stream`,
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
      signal,
    }
  );

  if (!response.ok) {
    await throwResponseError(response);
  }
  if (!response.body) {
    throw new Error("The server response could not be read.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  const handleLine = (line: string) => {
    if (line.trim()) {
      onEvent(JSON.parse(line) as WorkflowStreamEvent);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  handleLine(buffered + decoder.decode());
};
