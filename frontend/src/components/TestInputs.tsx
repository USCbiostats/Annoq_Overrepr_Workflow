import * as React from "react";
import { useState } from "react";
import {
  Button,
  TextField,
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
import { CorrectionType, InputTypes, TestType, Datasets } from "../constants";
import { process_rsids } from "../utils";
import { UploadFile } from "@mui/icons-material";
import { SAMPLE_VCF_FILE } from "./SampleVCF";
import { SAMPLE_RSID_LIST } from "./SampleRSIDList";

// Use material ui components

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

  const [chromosome, setChromosome] = useState("");
  const [startPosition, setStartPosition] = useState("");
  const [endPosition, setEndPosition] = useState("");

  const [rsIds, setRsIds] = useState("");

  const [vcfFile, setVcfFile] = useState("");

  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [testType, setTestType] = useState(TestType.FISHER);
  const [annotDataSet, setAnnotDataSet] = useState(Datasets[0].value);
  const [correction, setCorrection] = useState(CorrectionType.FDR);

  const submitDisabled =
    isLoading ||
    (inputType === InputTypes.VCF && !vcfFile.trim()) ||
    (inputType === InputTypes.CHROMOSOME &&
      (!chromosome.trim() || !startPosition.trim() || !endPosition.trim())) ||
    (inputType === InputTypes.RSIDS && !rsIds.trim());

  const query_data = () => {
    const data: Record<string, any> = {};

    if (inputType === InputTypes.CHROMOSOME) {
      data["chr"] = chromosome;
      data["start"] = startPosition;
      data["end"] = endPosition;

      return {
        input_type: inputType,
        chrQuery: data,
      };
    } else if (inputType === InputTypes.VCF) {
      const ids = vcfFile
        .split("\n")
        .filter((element) => {
          const regex = /^#/;
          return !regex.test(element) && element;
        })
        .map((s) => {
          const line = s.trim().split("\t");
          return `${line[0].replace("chr", "")}:${line[1]}${line[3]}>${
            line[4]
          }`;
        });

      data["ids"] = ids;

      return {
        input_type: "ids",
        idsQuery: data,
      };
    } else {
      data["rsIdList"] = process_rsids(rsIds);

      return {
        input_type: inputType,
        rsIdListQuery: data,
      };
    }
  };

  const handleRunTest = () => {
    const data = query_data();
    onRunTest(data, annotDataSet, testType, correction);
  };

  const handleReset = () => {
    setInputType(InputTypes.VCF);
    setChromosome("");
    setStartPosition("");
    setEndPosition("");
    setRsIds("");
    setVcfFile("");
    setTestType(TestType.FISHER);
    setAnnotDataSet(Datasets[0].value);
    setCorrection(CorrectionType.FDR);
    setAdvancedOptions(false);
    onReset();
  };

  const readFileEvent = (
    event: React.ChangeEvent<HTMLInputElement>,
    callback: (text: string) => void
  ) => {
    const reader = new FileReader();

    if (event.target.files && event.target.files.length) {
      const [file] = event.target.files;
      reader.readAsText(file);

      reader.onload = () => {
        callback((reader.result || "").toString());
        setRsIds((reader.result || "").toString());
      };
    }
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
              <FormControl component="fieldset" disabled={isLoading} fullWidth>
                <InputLabel id="type-label">Retrieve SNP data by</InputLabel>
                <Select
                  labelId="type-label"
                  label="Retrieve SNP data by"
                  value={inputType}
                  onChange={(e) => {
                    if (e.target.value === InputTypes.RSIDS) {
                      setRsIds("");
                    } else if (e.target.value === InputTypes.CHROMOSOME) {
                      setChromosome("");
                      setStartPosition("");
                      setEndPosition("");
                    } else {
                      setVcfFile("");
                    }

                    setInputType(e.target.value as InputTypes);
                  }}
                >
                  <MenuItem value={InputTypes.VCF}>VCF file</MenuItem>
                  <MenuItem value={InputTypes.CHROMOSOME}>Chromosome</MenuItem>
                  <MenuItem value={InputTypes.RSIDS}>rsIDs</MenuItem>
                </Select>
              </FormControl>

              {inputType === InputTypes.CHROMOSOME ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Chromosome"
                    value={chromosome}
                    onChange={(e) => setChromosome(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Start position"
                    value={startPosition}
                    onChange={(e) => setStartPosition(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="End position"
                    value={endPosition}
                    onChange={(e) => setEndPosition(e.target.value)}
                    fullWidth
                  />
                </Stack>
              ) : inputType === InputTypes.VCF ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="VCF file"
                    value={vcfFile}
                    onChange={(e) => setVcfFile(e.target.value)}
                    multiline
                    rows={5}
                    placeholder="Paste VCF content"
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button variant="outlined" component="label">
                      <UploadFile />
                      Upload VCF file
                      <input
                        style={{ display: "none" }}
                        type="file"
                        onChange={(event) => {
                          readFileEvent(event, setVcfFile);
                        }}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => setVcfFile(SAMPLE_VCF_FILE)}
                    >
                      Sample VCF file
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setVcfFile("")}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <TextField
                    label="rsIDs"
                    value={rsIds}
                    onChange={(e) => setRsIds(e.target.value)}
                    multiline
                    rows={5}
                    placeholder="Enter rsIDs separated by commas, spaces, or new lines"
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button variant="outlined" component="label">
                      <UploadFile />
                      Populate from file
                      <input
                        accept=".txt, .csv, .tsv"
                        style={{ display: "none" }}
                        type="file"
                        onChange={(event) => {
                          readFileEvent(event, setRsIds);
                        }}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => setRsIds(SAMPLE_RSID_LIST)}
                    >
                      Sample rsID list
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setRsIds("")}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              )}

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
                      onChange={(e) => setTestType(e.target.value as TestType)}
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
            </Stack>
          </fieldset>
        </FormGroup>
      </form>
    </Stack>
  );
};

export default TestInputs;
