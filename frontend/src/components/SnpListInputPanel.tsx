import * as React from "react";
import { useMemo, useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { UploadFile } from "@mui/icons-material";
import { InputTypes } from "../constants";
import { SNP_LIST_PREVIEW_COUNT, summarizeSnpList } from "../utils";

// Small samples are inline text. Large ones are static files under public/
// that are only downloaded when the sample button is clicked.
export type SnpListSample = string | { url: string; fileName: string };

export type SnpListInputPanelProps = {
  // Unique prefix for element ids when several panels are on the page.
  idPrefix: string;
  selectLabel: string;
  inputType: InputTypes;
  onInputTypeChange: (inputType: InputTypes) => void;
  text: string;
  onTextChange: (text: string) => void;
  sampleVcf: SnpListSample;
  sampleRsIds: SnpListSample;
  disabled?: boolean;
};

type LoadedFile = {
  name: string;
  text: string;
};

const SnpListInputPanel: React.FC<SnpListInputPanelProps> = ({
  idPrefix,
  selectLabel,
  inputType,
  onInputTypeChange,
  text,
  onTextChange,
  sampleVcf,
  sampleRsIds,
  disabled = false,
}) => {
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [readingFileName, setReadingFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isVcf = inputType === InputTypes.VCF;
  const sample = isVcf ? sampleVcf : sampleRsIds;
  const labelId = `${idPrefix}-type-label`;
  const entryLabel = isVcf ? "variants" : "rsIDs";

  // An uploaded file is shown as a read-only preview. Any other change to the
  // text (clear, sample, reset by the parent) drops back to editable mode.
  const showingFile = loadedFile !== null && loadedFile.text === text;

  const summary = useMemo(
    () => (text.trim() ? summarizeSnpList(inputType, text) : null),
    [inputType, text]
  );

  // Show a loaded file as a read-only preview while keeping its full text.
  const showLoadedFile = (name: string, fileText: string) => {
    setLoadedFile({ name, text: fileText });
    onTextChange(fileText);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Reset so choosing the same file again still triggers onChange.
    input.value = "";
    if (!file) {
      return;
    }

    setLoadError(null);
    setReadingFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      showLoadedFile(file.name, (reader.result || "").toString());
      setReadingFileName(null);
    };
    reader.onerror = () => {
      setLoadError(`Could not read ${file.name}.`);
      setReadingFileName(null);
    };
    reader.readAsText(file);
  };

  const handleSampleClick = async () => {
    setLoadError(null);
    if (typeof sample === "string") {
      onTextChange(sample);
      return;
    }

    setReadingFileName(sample.fileName);
    try {
      const response = await fetch(sample.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      showLoadedFile(sample.fileName, await response.text());
    } catch (error) {
      setLoadError(
        `Could not load ${sample.fileName} (${(error as Error).message}).`
      );
    } finally {
      setReadingFileName(null);
    }
  };

  let helperText = "";
  if (readingFileName) {
    helperText = `Reading ${readingFileName}…`;
  } else if (loadError) {
    helperText = loadError;
  } else if (summary) {
    const parts = [`${summary.count.toLocaleString()} ${entryLabel}`];
    if (summary.invalidRows > 0) {
      parts.push(`${summary.invalidRows.toLocaleString()} invalid rows skipped`);
    }
    const counts = parts.join(", ");
    helperText = showingFile
      ? `Loaded ${loadedFile.name}: ${counts} (showing first ${SNP_LIST_PREVIEW_COUNT})`
      : counts;
  }

  return (
    <Stack spacing={3}>
      <FormControl component="fieldset" disabled={disabled} fullWidth>
        <InputLabel id={labelId}>{selectLabel}</InputLabel>
        <Select
          labelId={labelId}
          label={selectLabel}
          value={inputType}
          onChange={(e) => {
            onTextChange("");
            onInputTypeChange(e.target.value as InputTypes);
          }}
        >
          <MenuItem value={InputTypes.VCF}>VCF file</MenuItem>
          <MenuItem value={InputTypes.RSIDS}>rsIDs</MenuItem>
        </Select>
      </FormControl>

      <Stack spacing={1.5}>
        <TextField
          label={isVcf ? "VCF file" : "rsIDs"}
          value={showingFile && summary ? summary.preview : text}
          onChange={(e) => onTextChange(e.target.value)}
          multiline
          rows={5}
          placeholder={
            isVcf
              ? "Paste VCF content"
              : "Enter rsIDs separated by commas, spaces, or new lines"
          }
          helperText={helperText || " "}
          error={loadError !== null && readingFileName === null}
          slotProps={{ input: { readOnly: showingFile } }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="outlined"
            component="label"
            disabled={readingFileName !== null}
          >
            <UploadFile />
            {isVcf ? "Upload VCF file" : "Populate from file"}
            <input
              style={{ display: "none" }}
              type="file"
              onChange={handleFileChange}
            />
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleSampleClick}
            disabled={!sample || readingFileName !== null}
          >
            {isVcf ? "Sample VCF file" : "Sample rsID list"}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              setLoadError(null);
              onTextChange("");
            }}
          >
            Clear
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default SnpListInputPanel;
