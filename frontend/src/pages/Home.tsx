import { useEffect, useRef, useState } from "react";
import TestInputs from "../components/TestInputs";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import ProgressPanel from "../components/ProgressPanel";
import Alert from "@mui/material/Alert";
import {
  Typography,
  Container,
  Box,
  Snackbar,
  AlertTitle,
  LinearProgress,
  Fade,
  Link,
  Stack,
  Button,
} from "@mui/material";
import {
  ALL_GENE_MAPPING_FIELDS,
  CorrectionType,
  GeneMappingField,
  InputTypes,
  TestType,
} from "../constants";
import {
  streamWorkflowOverrepresentation,
  MAX_OVERREP_GENE_COUNT,
} from "../apis";
import Footer from "../components/Footer";
import {
  WorkflowOverrepresentationResponse,
  WorkflowStreamEvent,
} from "../models";
import ResultDisplay from "../components/ResultDisplay";
import { WorkflowStages, applyStageEvent } from "../workflowProgress";

function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null as string | null);
  const [success, setSuccess] = useState(false);
  const [workflowResponse, setWorkflowResponse] = useState(
    null as WorkflowOverrepresentationResponse | null
  );
  const [currentStage, setCurrentStage] = useState(1);
  const [pantherId, setPantherId] = useState({
    dataset: "",
    correction: "" as CorrectionType,
    testType: "" as TestType,
  });
  const [resultInputType, setResultInputType] =
    useState<InputTypes | null>(null);
  const [resultMappingFields, setResultMappingFields] = useState({
    input: ALL_GENE_MAPPING_FIELDS,
    reference: null as GeneMappingField[] | null,
  });
  // Progress of the current run, from the streaming endpoint.
  const [stageProgress, setStageProgress] = useState<WorkflowStages>({});
  const [runStartedAt, setRunStartedAt] = useState(() => Date.now());
  // Set when gene details (download data) fail after results are shown.
  const [geneDetailsError, setGeneDetailsError] = useState<string | null>(null);
  const [downloadsReady, setDownloadsReady] = useState(false);
  const [referenceIsGeneList, setReferenceIsGeneList] = useState(false);
  const runAbortRef = useRef<AbortController | null>(null);

  // Stop any running analysis when the page is left or restarted from the
  // Home link or logo.
  useEffect(() => () => runAbortRef.current?.abort(), []);

  const onRunTest = async (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => {
    runAbortRef.current?.abort();
    const controller = new AbortController();
    runAbortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setGeneDetailsError(null);
    setDownloadsReady(false);
    setStageProgress({});
    setRunStartedAt(Date.now());
    setReferenceIsGeneList(
      payload?.referenceList?.input_type === InputTypes.GENES
    );

    let gotResult = false;
    let gotGeneDetails = false;
    let gotError = false;

    // Returns false when the results cannot be shown.
    const showResults = (response: WorkflowOverrepresentationResponse) => {
      setWorkflowResponse(response);

      if (response.gene_list.length === 0) {
        setError("No genes found. Please check your input.");
        return false;
      }

      if (response.gene_list.length > MAX_OVERREP_GENE_COUNT) {
        setError(
          "We support a maximum of 100,000 unique genes for PANTHER overrepresentation. " +
            `Your input produced ${response.gene_list.length.toLocaleString()} unique genes. ` +
            "Please reduce the number of input variants and try again."
        );
        return false;
      }

      setPantherId({
        dataset,
        correction,
        testType,
      });

      const nextResultInputType: InputTypes | null =
        payload?.input_type === "ids"
          ? InputTypes.VCF
          : payload?.input_type === InputTypes.RSIDS
          ? InputTypes.RSIDS
          : null;

      setResultInputType(nextResultInputType);
      setResultMappingFields({
        input: payload?.geneMappingFields ?? ALL_GENE_MAPPING_FIELDS,
        // A reference gene list is not mapped, so it has no mapping tools.
        reference:
          payload?.referenceList?.input_type === InputTypes.GENES
            ? null
            : payload?.referenceList?.geneMappingFields ?? null,
      });

      setCurrentStage(2);
      setSuccess(true);
      return true;
    };

    const onEvent = (event: WorkflowStreamEvent) => {
      if (controller.signal.aborted) {
        return;
      }
      switch (event.event) {
        case "stage":
          setStageProgress((prev) => applyStageEvent(prev, event, Date.now()));
          break;
        case "result":
          gotResult = true;
          setIsLoading(false);
          if (!showResults(event.data)) {
            // Nothing to download for results that are not shown.
            controller.abort();
          }
          break;
        case "gene_details":
          gotGeneDetails = true;
          setWorkflowResponse((prev) => (prev ? { ...prev, ...event.data } : prev));
          setDownloadsReady(true);
          break;
        case "error":
          gotError = true;
          if (gotResult) {
            // Results are already on screen; only downloads are affected.
            setGeneDetailsError(event.detail);
          } else {
            setError(event.detail);
          }
          break;
      }
    };

    try {
      await streamWorkflowOverrepresentation(
        payload,
        dataset,
        correction,
        testType,
        onEvent,
        controller.signal
      );
      if (controller.signal.aborted || gotError) {
        return;
      }
      if (!gotResult) {
        setError(
          "The server closed the connection before the analysis finished. Please try again."
        );
      } else if (!gotGeneDetails) {
        setGeneDetailsError("The server closed the connection before download data arrived.");
      }
    } catch (error: any) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        error?.message || "Error occurred while fetching data. Please try again.";
      if (gotResult) {
        setGeneDetailsError(message);
      } else {
        setError(message);
      }
    } finally {
      if (runAbortRef.current === controller) {
        runAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const submitToPanther = () => {
    if (!workflowResponse?.gene_list.length) {
      setError("No gene list available. Please run the analysis again.");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/services/oai/pantherdb/enrich/overrep"; //"https://pantherdb.org/services/oai/pantherdb/enrich/overrep";
    form.target = "_blank";

    const correctionField = document.createElement("input");
    correctionField.type = "hidden";
    correctionField.name = "correction";
    correctionField.value = pantherId.correction;

    const datasetField = document.createElement("input");
    datasetField.type = "hidden";
    datasetField.name = "annotDataSet";
    datasetField.value = pantherId.dataset;

    const testTypeField = document.createElement("input");
    testTypeField.type = "hidden";
    testTypeField.name = "enrichmentTestType";
    testTypeField.value = pantherId.testType;

    const speciesField = document.createElement("input");
    speciesField.type = "hidden";
    speciesField.name = "organism";
    speciesField.value = "9606";

    const formatField = document.createElement("input");
    formatField.type = "hidden";
    formatField.name = "format";
    formatField.value = "html";

    const resourceField = document.createElement("input");
    resourceField.type = "hidden";
    resourceField.name = "resource";
    resourceField.value = "PANTHER";

    const inputField = document.createElement("input");
    inputField.type = "hidden";
    inputField.name = "geneInputList";
    inputField.value = workflowResponse.gene_list.join(",");

    form.appendChild(correctionField);
    form.appendChild(datasetField);
    form.appendChild(testTypeField);
    form.appendChild(speciesField);
    form.appendChild(formatField);
    form.appendChild(resourceField);
    form.appendChild(inputField);

    // Keep PANTHER's page consistent with SNPWay when a custom reference was used.
    if (workflowResponse.reference_gene_list?.length) {
      const refInputField = document.createElement("input");
      refInputField.type = "hidden";
      refInputField.name = "refInputList";
      refInputField.value = workflowResponse.reference_gene_list.join(",");

      const refOrganismField = document.createElement("input");
      refOrganismField.type = "hidden";
      refOrganismField.name = "refOrganism";
      refOrganismField.value = "9606";

      form.appendChild(refInputField);
      form.appendChild(refOrganismField);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  const resetAnalysis = () => {
    // Stops any download data still being prepared for these results.
    runAbortRef.current?.abort();
    runAbortRef.current = null;
    setIsLoading(false);
    setGeneDetailsError(null);
    setCurrentStage(1);
    setWorkflowResponse(null);
    setError(null);
    setResultInputType(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <BrandHeader />
      <TopBar />

      <Box
        sx={{ width: "100%", position: "fixed", top: 0, left: 0, zIndex: 9999 }}
      >
        <Fade in={isLoading} unmountOnExit>
          <LinearProgress color="primary" />
        </Fade>
      </Box>

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 3, md: 4 } }}>
        <Box sx={{ px: 0 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 2, md: 3 }}
              sx={{ px: 0 }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  Gene overrepresentation, step by step
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: 800 }}
                >
                  Start with SNPs or rsIDs, collect gene mappings through AnnoQ,
                  then launch PANTHER enrichment without switching tools. Please note, SNPWay is based on GRCh37/hg19.
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (currentStage !== 1) {
                      resetAnalysis();
                    }
                    requestAnimationFrame(() => {
                      document
                        .getElementById("snpway-inputs")
                        ?.scrollIntoView({ behavior: "smooth" });
                    });
                  }}
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  Start an analysis
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => window.open("https://annoq.org/", "_blank")}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Visit AnnoQ
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() =>
                    window.open("https://pantherdb.org/", "_blank")
                  }
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Visit PANTHER
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
        {/* <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            SNPWay workflow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your variants, review mappings, and submit the resulting gene
            list directly to PANTHER for overrepresentation testing.
          </Typography>
        </Box> */}

        {currentStage === 1 ? (
          <Box
            id="snpway-inputs"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: { xs: 3, md: 3.5 },
              bgcolor: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isLoading && (
              <ProgressPanel
                stages={stageProgress}
                startedAt={runStartedAt}
                stageLabels={
                  referenceIsGeneList
                    ? { reference: "Reading reference gene list" }
                    : undefined
                }
              />
            )}

            <TestInputs
              onRunTest={onRunTest}
              isLoading={isLoading}
              onReset={() => {
                setError(null);
                setIsLoading(false);
              }}
            />
          </Box>
        ) : (
          <ResultDisplay
            workflowResponse={workflowResponse}
            resetAnalysis={resetAnalysis}
            submitToPanther={submitToPanther}
            annotationDataset={pantherId.dataset}
            correctionType={pantherId.correction}
            inputTypeUsed={resultInputType}
            inputMappingFields={resultMappingFields.input}
            referenceMappingFields={resultMappingFields.reference}
            downloadsReady={downloadsReady}
            geneDetailsProgress={stageProgress.gene_details ?? null}
            geneDetailsError={geneDetailsError}
          />
        )}

        {error !== null && (
          <Alert
            variant="filled"
            severity="error"
            sx={{ mt: 2, borderRadius: 1 }}
            onClose={() => setError(null)}
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Snackbar
          open={success}
          autoHideDuration={6000}
          onClose={handleCloseSuccess}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSuccess}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            <AlertTitle>Success</AlertTitle>
            {currentStage === 1
              ? "Gene data processed successfully. Results opening in a new tab."
              : "Gene data processed successfully. View the results below."}
          </Alert>
        </Snackbar>

        <Box
          sx={{
            textAlign: "center",
            mt: 3,
            mb: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: "rgba(0, 0, 0, 0.03)",
          }}
        >
          <Typography
            variant="body1"
            color="text.primary"
            sx={{ fontWeight: 500 }}
          >
            Powered by{" "}
            <Link
              href="https://annoq.org/"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              Annoq
            </Link>{" "}
            version 1.3 and{" "}
            <Link
              href="https://pantherdb.org/"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              PANTHER
            </Link>
            {". "}
            For the data version of individual tools in AnnoQ, please visit:{" "}
            <Link
              href="http://annoq.org/version"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              annoq.org/version
            </Link>
          </Typography>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
}

export default Home;
