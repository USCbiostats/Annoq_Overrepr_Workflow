import { useState } from "react";
import TestInputs from "../components/TestInputs";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
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
import { CorrectionType, InputTypes, TestType } from "../constants";
import {
  getGeneMappings,
  getOverrepresentation,
  MAX_OVERREP_GENE_COUNT,
} from "../apis";
import Footer from "../components/Footer";
import { GeneMappingResponse } from "../models";
import ResultDisplay from "../components/ResultDisplay";

function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null as string | null);
  const [success, setSuccess] = useState(false);
  const [response, setResponse] = useState(null as GeneMappingResponse | null);
  const [overrepresentationResult, setOverrepresentationResult] = useState(
    null as any
  );
  const [currentStage, setCurrentStage] = useState(1);
  const [pantherId, setPantherId] = useState({
    dataset: "",
    correction: "" as CorrectionType,
    testType: "" as TestType,
  });
  const [resultInputType, setResultInputType] =
    useState<InputTypes | null>(null);

  const onRunTest = async (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await getGeneMappings(payload);
      setResponse(response);

      if (!response) {
        setError("No data returned from the server. Please try again.");
        return;
      }
      if (response.gene_list.length === 0) {
        setError("No genes found. Please check your input.");
        return;
      }

      if (response.gene_list.length > MAX_OVERREP_GENE_COUNT) {
        setError(
          "We support a maximum of 100,000 unique genes for PANTHER overrepresentation. " +
            `Your input produced ${response.gene_list.length.toLocaleString()} unique genes. ` +
            "Please narrow the query range and try again."
        );
        return;
      }

      const overrepresentationResponse = await getOverrepresentation(
        response.gene_list.join(","),
        dataset,
        correction,
        testType
      );
      if (!overrepresentationResponse) {
        setError("No data returned from the server. Please try again.");
        return;
      }
      setOverrepresentationResult(overrepresentationResponse);

      setPantherId({
        dataset,
        correction,
        testType,
      });

      const nextResultInputType: InputTypes | null =
        payload?.input_type === "ids"
          ? InputTypes.VCF
          : payload?.input_type === InputTypes.CHROMOSOME
          ? InputTypes.CHROMOSOME
          : payload?.input_type === InputTypes.RSIDS
          ? InputTypes.RSIDS
          : null;

      setResultInputType(nextResultInputType);

      setCurrentStage(2);
      setSuccess(true);
    } catch (error: any) {
      setError(error?.message || "Error occurred while fetching data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitToPanther = () => {
    if (!response?.gene_list.length) {
      setError("No gene list available. Please run the analysis again.");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://pantherdb.org/services/oai/pantherdb/enrich/overrep";
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
    inputField.value = response.gene_list.join(",");

    form.appendChild(correctionField);
    form.appendChild(datasetField);
    form.appendChild(testTypeField);
    form.appendChild(speciesField);
    form.appendChild(formatField);
    form.appendChild(resourceField);
    form.appendChild(inputField);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  const resetAnalysis = () => {
    setCurrentStage(1);
    setResponse(null);
    setOverrepresentationResult(null);
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
                  then launch PANTHER enrichment without switching tools.
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    const el = document.getElementById("snpway-inputs");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
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
              <Box
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Processing your request, please wait...
                </Typography>
              </Box>
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
            response={response}
            overrepresentationResult={overrepresentationResult}
            resetAnalysis={resetAnalysis}
            submitToPanther={submitToPanther}
            annotationDataset={pantherId.dataset}
            correctionType={pantherId.correction}
            inputTypeUsed={resultInputType}
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
