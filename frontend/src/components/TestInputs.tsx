import * as React from "react";
import { useState } from "react";
import {
  Alert,
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
  const [inputError, setInputError] = useState<string | null>(null);

  const normalizeChromosome = (rawChromosome: string): string => {
    const trimmed = rawChromosome.trim();
    if (!trimmed) return "";
    const withoutPrefix = trimmed.replace(/^chr/i, "");
    return withoutPrefix;
  };

  const toAnnoqVariantId = (rawChromosome: string, pos: string, ref: string, alt: string): string => {
    const chromosome = normalizeChromosome(rawChromosome);
    return `${chromosome}:${pos}${ref}>${alt}`;
  };

  const parseVcfToIds = (
    rawVcf: string
  ): { ids: string[]; invalidRows: number } => {
    const ids: string[] = [];
    let invalidRows = 0;

    for (const line of rawVcf.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Prefer tab parsing so empty VCF ID field is preserved.
      let chrom = "";
      let pos = "";
      let ref = "";
      let alt = "";

      const tabFields = trimmed.split("\t");
      if (tabFields.length >= 5) {
        // VCF columns: CHROM POS ID REF ALT ...
        chrom = tabFields[0];
        pos = tabFields[1];
        ref = tabFields[3];
        alt = tabFields[4];
      } else {
        // Fallback for whitespace-separated rows (tabs replaced by spaces, etc.).
        const wsFields = trimmed.split(/\s+/);
        if (wsFields.length >= 5) {
          // CHROM POS ID REF ALT ... (ID can be '.')
          chrom = wsFields[0];
          pos = wsFields[1];
          ref = wsFields[3];
          alt = wsFields[4];
        } else if (wsFields.length >= 4) {
          // CHROM POS REF ALT
          chrom = wsFields[0];
          pos = wsFields[1];
          ref = wsFields[2];
          alt = wsFields[3];
        } else {
          invalidRows += 1;
          continue;
        }
      }

      if (!chrom || !pos || !ref || !alt || ref === "." || alt === ".") {
        invalidRows += 1;
        continue;
      }

      ids.push(toAnnoqVariantId(chrom, pos, ref, alt));
    }

    return { ids, invalidRows };
  };

  const submitDisabled =
    isLoading ||
    (inputType === InputTypes.VCF && !vcfFile.trim()) ||
    (inputType === InputTypes.CHROMOSOME &&
      (!chromosome.trim() || !startPosition.trim() || !endPosition.trim())) ||
    (inputType === InputTypes.RSIDS && !rsIds.trim());

  const query_data = () => {
    const data: Record<string, any> = {};

    if (inputType === InputTypes.CHROMOSOME) {
      data["chr"] = normalizeChromosome(chromosome);
      data["start"] = startPosition;
      data["end"] = endPosition;

      return {
        input_type: inputType,
        chrQuery: data,
      };
    } else if (inputType === InputTypes.VCF) {
      const { ids, invalidRows } = parseVcfToIds(vcfFile);
      if (ids.length === 0) {
        throw new Error(
          "No valid variants were found in the VCF input. Make sure each row includes CHROM, POS, REF, and ALT."
        );
      }

      if (invalidRows > 0) {
        setInputError(
          `Skipped ${invalidRows} invalid VCF row(s). Continue with ${ids.length} valid variant(s).`
        );
      }

      data["ids"] = ids;

      return {
        input_type: "ids",
        idsQuery: data,
      };
    } else {
      const parsedRsids = process_rsids(rsIds);
      if (parsedRsids.length === 0) {
        throw new Error("No valid rsIDs were found in the input.");
      }

      data["rsIdList"] = parsedRsids;

      return {
        input_type: inputType,
        rsIdListQuery: data,
      };
    }
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
    setInputError(null);
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
