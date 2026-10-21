import * as React from "react";
import { useState } from "react";
import {
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  Typography,
  Stack,
  Box,
} from "@mui/material";
import {
  ALL_GENE_MAPPING_FIELDS,
  CorrectionType,
  GeneMappingField,
  InputTypes,
  TestType,
  Datasets,
} from "../constants";
import { buildSnpListPayload } from "../utils";
import { SAMPLE_VCF_FILE } from "./SampleVCF";
import { SAMPLE_RSID_LIST } from "./SampleRSIDList";
import SnpListInputPanel, { SnpListSample } from "./SnpListInputPanel";
import GeneMappingToolsSelector from "./GeneMappingToolsSelector";

// Use material ui components

// 100K-entry reference samples drawn from HRC r1.1, served from public/samples.
const SAMPLE_REFERENCE_VCF: SnpListSample = {
  url: `${import.meta.env.BASE_URL}samples/reference_sample_100K.vcf`,
  fileName: "reference_sample_100K.vcf",
};
const SAMPLE_REFERENCE_RSIDS: SnpListSample = {
  url: `${import.meta.env.BASE_URL}samples/reference_sample_100K_rsids.txt`,
  fileName: "reference_sample_100K_rsids.txt",
};

export type TestInputsProps = {
  onRunTest: (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => void;
  onReset: () => void;
  isLoading: boolean;
};

const TestInputs: React.FC<TestInputsProps> = ({
  onRunTest,
  isLoading,
  onReset,
}) => {
  const [inputType, setInputType] = useState(InputTypes.VCF);
  const [inputText, setInputText] = useState("");
  const [inputMappingFields, setInputMappingFields] = useState<
    GeneMappingField[]
  >(ALL_GENE_MAPPING_FIELDS);

  const [useCustomReference, setUseCustomReference] = useState(false);
  const [refInputType, setRefInputType] = useState(InputTypes.VCF);
  const [refText, setRefText] = useState("");
  const [refSameAsInput, setRefSameAsInput] = useState(true);
  const [refMappingFields, setRefMappingFields] = useState<
    GeneMappingField[]
  >(ALL_GENE_MAPPING_FIELDS);

  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [testType, setTestType] = useState(TestType.FISHER);
  const [annotDataSet, setAnnotDataSet] = useState(Datasets[0].value);
  const [correction, setCorrection] = useState(CorrectionType.FDR);
  const [inputError, setInputError] = useState<string | null>(null);

  const effectiveRefMappingFields = refSameAsInput
    ? inputMappingFields
    : refMappingFields;

  const submitDisabled =
    isLoading ||
    !inputText.trim() ||
    inputMappingFields.length === 0 ||
    (useCustomReference &&
      (!refText.trim() || effectiveRefMappingFields.length === 0));

  const query_data = () => {
    const input = buildSnpListPayload(
      inputType,
      inputText,
      inputMappingFields
    );
    const warnings = [input.warning];

    let referenceList = undefined;
    if (useCustomReference) {
      const reference = buildSnpListPayload(
        refInputType,
        refText,
        effectiveRefMappingFields,
        "reference "
      );
      warnings.push(reference.warning);
      referenceList = reference.payload;
    }

    const warningText = warnings.filter(Boolean).join(" ");
    if (warningText) {
      setInputError(warningText);
    }

    return referenceList
      ? { ...input.payload, referenceList }
      : input.payload;
  };

  const handleRunTest = () => {
    setInputError(null);
    try {
      const data = query_data();
      onRunTest(data, annotDataSet, testType, correction);
    } catch (error) {
      setInputError((error as Error).message);
    }
  };

  const handleRefSameAsInputChange = (checked: boolean) => {
    if (!checked) {
      // Start the reference selection from the input list's current selection.
      setRefMappingFields(inputMappingFields);
    }
    setRefSameAsInput(checked);
  };

  const handleReset = () => {
    setInputType(InputTypes.VCF);
    setInputText("");
    setInputMappingFields(ALL_GENE_MAPPING_FIELDS);
    setUseCustomReference(false);
    setRefInputType(InputTypes.VCF);
    setRefText("");
    setRefSameAsInput(true);
    setRefMappingFields(ALL_GENE_MAPPING_FIELDS);
    setTestType(TestType.FISHER);
    setAnnotDataSet(Datasets[0].value);
    setCorrection(CorrectionType.FDR);
    setAdvancedOptions(false);
    setInputError(null);
    onReset();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Prepare your input
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose how you would like to provide SNP data, then pick the
          annotation dataset and statistical settings.
        </Typography>
      </Box>

      <form>
        <FormGroup>
          <fieldset disabled={isLoading} style={{ border: "none", padding: 0 }}>
            <Stack spacing={3}>
              <SnpListInputPanel
                idPrefix="input"
                selectLabel="Retrieve SNP data by"
                inputType={inputType}
                onInputTypeChange={setInputType}
                text={inputText}
                onTextChange={setInputText}
                sampleVcf={SAMPLE_VCF_FILE}
                sampleRsIds={SAMPLE_RSID_LIST}
                disabled={isLoading}
              />

              <GeneMappingToolsSelector
                title="SNP to gene mapping tools for input list"
                value={inputMappingFields}
                onChange={setInputMappingFields}
                disabled={isLoading}
              />

              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Select an annotation dataset to analyze.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl
                  component={"fieldset"}
                  disabled={isLoading}
                  fullWidth
                >
                  <InputLabel id="test-dataset-label">
                    Annotation data set
                  </InputLabel>
                  <Select
                    labelId="test-dataset-label"
                    label="Annotation data set"
                    value={annotDataSet}
                    onChange={(e) => setAnnotDataSet(e.target.value)}
                  >
                    {Datasets?.map((dataset) => (
                      <MenuItem key={dataset.value} value={dataset.value}>
                        {dataset.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={advancedOptions}
                    onChange={() => setAdvancedOptions(!advancedOptions)}
                  />
                }
                label="Show advanced options"
              />

              <Collapse in={advancedOptions}>
                <Stack spacing={3}>
                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={useCustomReference}
                          onChange={(e) =>
                            setUseCustomReference(e.target.checked)
                          }
                        />
                      }
                      label="Use custom reference list"
                    />
                    <Typography variant="body2" color="text.secondary">
                      By default PANTHER uses all human genes as the reference
                      list. Provide the background SNPs (for example, all
                      genotyped SNPs) to use their genes instead.
                    </Typography>
                  </Box>

                  <Collapse in={useCustomReference} unmountOnExit>
                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 2,
                      }}
                    >
                      <Stack spacing={3}>
                        <Typography variant="subtitle2">
                          Reference list
                        </Typography>
                        <SnpListInputPanel
                          idPrefix="reference"
                          selectLabel="Retrieve reference SNP data by"
                          inputType={refInputType}
                          onInputTypeChange={setRefInputType}
                          text={refText}
                          onTextChange={setRefText}
                          sampleVcf={SAMPLE_REFERENCE_VCF}
                          sampleRsIds={SAMPLE_REFERENCE_RSIDS}
                          disabled={isLoading}
                        />
                        <GeneMappingToolsSelector
                          title="SNP to gene mapping tools for reference list"
                          value={effectiveRefMappingFields}
                          onChange={setRefMappingFields}
                          disabled={isLoading}
                          sameAsInput={{
                            checked: refSameAsInput,
                            onChange: handleRefSameAsInputChange,
                          }}
                        />
                      </Stack>
                    </Box>
                  </Collapse>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <FormControl
                      component={"fieldset"}
                      disabled={isLoading}
                      fullWidth
                    >
                      <InputLabel id="test-type-label">Test type</InputLabel>
                      <Select
                        labelId="test-type-label"
                        label="Test type"
                        value={testType}
                        onChange={(e) =>
                          setTestType(e.target.value as TestType)
                        }
                      >
                        <MenuItem value={TestType.FISHER}>
                          Fisher’s exact
                        </MenuItem>
                        <MenuItem value={TestType.BINOMIAL}>Binomial</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl
                      component={"fieldset"}
                      disabled={isLoading}
                      fullWidth
                    >
                      <InputLabel id="correction-label">Correction</InputLabel>
                      <Select
                        labelId="correction-label"
                        label="Correction"
                        value={correction}
                        onChange={(e) =>
                          setCorrection(e.target.value as CorrectionType)
                        }
                      >
                        <MenuItem value={CorrectionType.FDR}>
                          Calculate false discovery rate
                        </MenuItem>
                        <MenuItem value={CorrectionType.BONFERRONI}>
                          Use the Bonferroni correction for multiple testing
                        </MenuItem>
                        <MenuItem value={CorrectionType.NONE}>
                          No correction
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              </Collapse>

              <Stack alignItems={"start"} direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRunTest}
                  disabled={submitDisabled}
                >
                  Run test
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </Stack>

              {inputError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {inputError}
                </Alert>
              )}
            </Stack>
          </fieldset>
        </FormGroup>
      </form>
    </Stack>
  );
};

export default TestInputs;
