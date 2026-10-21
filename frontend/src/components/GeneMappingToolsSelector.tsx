import * as React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  GENE_MAPPING_TOOLS,
  GeneMappingField,
  GeneMappingTool,
} from "../constants";
import { describeGeneMappingFields } from "../utils";

export type GeneMappingToolsSelectorProps = {
  title: string;
  value: GeneMappingField[];
  onChange: (fields: GeneMappingField[]) => void;
  disabled?: boolean;
  // When provided, shows a "Same as input list" toggle. While it is checked the
  // tool checkboxes are read-only and `value` should mirror the input list.
  sameAsInput?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
};

const toolFields = (tool: GeneMappingTool): GeneMappingField[] =>
  tool.field
    ? [tool.field]
    : [tool.ensembl, tool.refseq].filter(
        (field): field is GeneMappingField => field !== undefined
      );

const GeneMappingToolsSelector: React.FC<GeneMappingToolsSelectorProps> = ({
  title,
  value,
  onChange,
  disabled = false,
  sameAsInput,
}) => {
  const selected = new Set(value);
  const checkboxesDisabled = disabled || (sameAsInput?.checked ?? false);

  // Keep the selection in the canonical tool order.
  const emit = (next: Set<GeneMappingField>) => {
    onChange(
      GENE_MAPPING_TOOLS.flatMap(toolFields).filter((field) => next.has(field))
    );
  };

  const toggleField = (field: GeneMappingField) => {
    const next = new Set(selected);
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    emit(next);
  };

  // Checked -> clear both; unchecked or partially checked -> select both.
  const toggleTool = (tool: GeneMappingTool) => {
    const fields = toolFields(tool);
    const allSelected = fields.every((field) => selected.has(field));
    const next = new Set(selected);
    fields.forEach((field) =>
      allSelected ? next.delete(field) : next.add(field)
    );
    emit(next);
  };

  const summary = sameAsInput?.checked
    ? "Same as input list"
    : describeGeneMappingFields(value);

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{ "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2">
          <strong>{title}:</strong>{" "}
          <Box
            component="span"
            sx={{ color: value.length === 0 ? "error.main" : "text.secondary" }}
          >
            {summary}
          </Box>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {sameAsInput && (
          <FormControlLabel
            control={
              <Checkbox
                checked={sameAsInput.checked}
                onChange={(e) => sameAsInput.onChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label="Same as input list"
            sx={{ mb: 1 }}
          />
        )}
        <Stack divider={<Divider flexItem />} spacing={0.5}>
          {GENE_MAPPING_TOOLS.map((tool) => {
            const fields = toolFields(tool);
            const selectedCount = fields.filter((field) =>
              selected.has(field)
            ).length;

            return (
              <Stack
                key={tool.label}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCount === fields.length}
                      indeterminate={
                        selectedCount > 0 && selectedCount < fields.length
                      }
                      onChange={() => toggleTool(tool)}
                      disabled={checkboxesDisabled}
                    />
                  }
                  label={tool.label}
                  sx={{ minWidth: 160 }}
                />
                {!tool.field && (
                  <Stack direction="row" sx={{ pl: { xs: 4, sm: 0 } }}>
                    {tool.ensembl && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selected.has(tool.ensembl)}
                            onChange={() => toggleField(tool.ensembl!)}
                            disabled={checkboxesDisabled}
                          />
                        }
                        label="Ensembl"
                      />
                    )}
                    {tool.refseq && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selected.has(tool.refseq)}
                            onChange={() => toggleField(tool.refseq!)}
                            disabled={checkboxesDisabled}
                          />
                        }
                        label="RefSeq"
                      />
                    )}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
        {value.length === 0 && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Select at least one SNP-to-gene mapping tool.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default GeneMappingToolsSelector;
