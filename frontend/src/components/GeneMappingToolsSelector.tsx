import * as React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  // false shows the checkboxes directly instead of inside a collapsed accordion.
  collapsible?: boolean;
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
  collapsible = true,
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

  // Checked -> clear all gene models; unchecked or partially checked
  // (shown with a dash) -> select all of them.
  const toggleTool = (tool: GeneMappingTool) => {
    const fields = toolFields(tool);
    const allSelected = fields.every((field) => selected.has(field));
    const next = new Set(selected);
    fields.forEach((field) =>
      allSelected ? next.delete(field) : next.add(field)
    );
    emit(next);
  };

  const geneModelCheckbox = (field: GeneMappingField, label: string) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={selected.has(field)}
          onChange={() => toggleField(field)}
          disabled={checkboxesDisabled}
        />
      }
      label={label}
    />
  );

  const summary = sameAsInput?.checked
    ? "Same as input list"
    : describeGeneMappingFields(value);

  const heading = (
    <Typography variant="body2">
      <strong>{title}:</strong>{" "}
      <Box
        component="span"
        sx={{ color: value.length === 0 ? "error.main" : "text.secondary" }}
      >
        {summary}
      </Box>
    </Typography>
  );

  const details = (
    <>
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
      <Table size="small" sx={{ "& td, & th": { px: 1 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Mapping method</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">
              Use method
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Gene model</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {GENE_MAPPING_TOOLS.map((tool) => {
            const fields = toolFields(tool);
            const selectedCount = fields.filter((field) =>
              selected.has(field)
            ).length;
            const inUse = selectedCount > 0;
            return (
              <TableRow
                key={tool.label}
                sx={{ "&:last-child td": { borderBottom: 0 } }}
              >
                <TableCell
                  sx={{
                    color: inUse ? "text.primary" : "text.secondary",
                    fontWeight: inUse ? 600 : 400,
                  }}
                >
                  {tool.label}
                </TableCell>
                <TableCell align="center">
                  {/* Larger and green so it reads differently from the
                      small blue gene model checkboxes. */}
                  <Checkbox
                    color="success"
                    checked={selectedCount === fields.length}
                    indeterminate={inUse && selectedCount < fields.length}
                    onChange={() => toggleTool(tool)}
                    disabled={checkboxesDisabled}
                    inputProps={{ "aria-label": `Use ${tool.label}` }}
                    sx={{ "& .MuiSvgIcon-root": { fontSize: 28 } }}
                  />
                </TableCell>
                <TableCell>
                  {!tool.field && (
                    <Stack direction="row" flexWrap="wrap">
                      {tool.ensembl &&
                        geneModelCheckbox(tool.ensembl, "Ensembl")}
                      {tool.refseq && geneModelCheckbox(tool.refseq, "RefSeq")}
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {value.length === 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Select at least one SNP-to-gene mapping tool.
        </Typography>
      )}
    </>
  );

  if (!collapsible) {
    return (
      <Box>
        <Box sx={{ mb: 1 }}>{heading}</Box>
        {details}
      </Box>
    );
  }

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{ "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>{heading}</AccordionSummary>
      <AccordionDetails>{details}</AccordionDetails>
    </Accordion>
  );
};

export default GeneMappingToolsSelector;
