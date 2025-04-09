import React, { useMemo, useRef, useState } from "react";
import {
  Typography,
  Paper,
  Box,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { TableVirtuoso, TableComponents } from "react-virtuoso";
import { GeneMappingResponse } from "../models";
import { createResultsTableData } from "../components/utils";
import { CorrectionType, Datasets } from "../constants";

interface ResultDisplayProps {
  response: GeneMappingResponse | null;
  overrepresentationResult: any;
  resetAnalysis: () => void;
  submitToPanther: () => void;
  annotationDataset: string;
  correctionType: CorrectionType;
}

// Define the structure of overrepresentation result items
interface OverrepResultItem {
  process: string;
  refCount: number;
  uploadCount: number;
  expected: number;
  foldEnrichment: number;
  overUnder: string;
  pValue: number;
  fdr: number;
}

// Define column data structure
interface ColumnData {
  dataKey: keyof OverrepResultItem;
  label: string;
  numeric?: boolean;
  width?: number;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  response,
  overrepresentationResult,
  annotationDataset,
  correctionType,
  resetAnalysis,
  submitToPanther,
}) => {
  // Add state to track whether to show all results
  const [showAllResults, setShowAllResults] = useState(false);

  // Parse overrepresentation results
  const { tableData, filteredData } = useMemo(() => {
    if (!overrepresentationResult || !overrepresentationResult.results)
      return { tableData: [], filteredData: [] };

    // Extract the reference and input list info
    const { reference, input_list, result } = overrepresentationResult.results;

    // Check if we have valid result data
    if (!result || !Array.isArray(result))
      return { tableData: [], filteredData: [] };

    // Extract the biological processes and their data from the API response
    const allData = result
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        let processName = "";
        if (!item.term || !item.term.label) {
          processName = `Process ${index + 1}`;
        } else {
          processName = item.term.label;
        }

        return {
          process: processName,
          refCount: item.number_in_reference || 0,
          uploadCount: item.number_in_list || 0,
          expected:
            typeof item.expected === "number" ? +item.expected.toFixed(2) : 0,
          foldEnrichment:
            typeof item.fold_enrichment === "number"
              ? +item.fold_enrichment.toFixed(2)
              : 0,
          overUnder: item.plus_minus || "+",
          pValue:
            typeof item.pValue === "number" ? +item.pValue.toExponential(2) : 0,
          fdr: typeof item.fdr === "number" ? +item.fdr.toExponential(2) : 0,
        };
      });

    // Filter the data based on correction type
    const filteredResults = allData.filter((item) => {
      if (correctionType === CorrectionType.FDR) {
        return item.fdr < 0.05;
      } else {
        return item.pValue < 0.05;
      }
    });

    return {
      tableData: allData,
      filteredData: filteredResults,
    };
  }, [overrepresentationResult, correctionType]);

  // Determine which data to display based on the showAllResults state
  const displayData = showAllResults ? tableData : filteredData;

  // Ref for the table container to measure available height
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadCSV = () => {
    if (!response) return;

    // Generate table data using the utility function
    const tableData = createResultsTableData(response);

    // Convert the data to CSV format
    const headers = Object.keys(tableData[0] || {});
    const csvRows = [
      headers.join(","), // Header row
      ...tableData.map((row) =>
        headers
          .map((header) => {
            // Handle array fields and escape commas in text
            const value = row[header as keyof typeof row];
            if (Array.isArray(value)) {
              return `"${value.join(";")}"`;
            }
            return typeof value === "string"
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "gene_mapping_results.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define table columns
  const columns: ColumnData[] = [
    {
      width: 300,
      label:
        Datasets.find((dataset) => dataset.value === annotationDataset)?.name ||
        annotationDataset,
      dataKey: "process",
    },
    {
      width: 80,
      label: "#",
      dataKey: "refCount",
      numeric: true,
    },
    {
      width: 80,
      label: "#",
      dataKey: "uploadCount",
      numeric: true,
    },
    {
      width: 100,
      label: "expected",
      dataKey: "expected",
      numeric: true,
    },
    {
      width: 120,
      label: "Fold Enrichment",
      dataKey: "foldEnrichment",
      numeric: true,
    },
    {
      width: 60,
      label: "+/-",
      dataKey: "overUnder",
    },
    {
      width: 100,
      label:
        correctionType === CorrectionType.BONFERRONI
          ? "P Value"
          : "raw P value",
      dataKey: "pValue",
      numeric: true,
    },
  ];

  // Add FDR column if correction type is not Bonferroni
  if (correctionType === CorrectionType.FDR) {
    columns.push({
      width: 100,
      label: "FDR",
      dataKey: "fdr",
      numeric: true,
    });
  }

  // Define Virtuoso Table Components
  const VirtuosoTableComponents: TableComponents<OverrepResultItem> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
      <Table
        {...props}
        sx={{ borderCollapse: "separate", tableLayout: "fixed" }}
      />
    ),
    TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableHead {...props} ref={ref} />
    )),
    TableRow,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  };

  // Header content without sort functionality
  const fixedHeaderContent = () => {
    return (
      <>
        {/* First Header Row */}
        <TableRow>
          <TableCell sx={{ width: 300 }}></TableCell>
          <TableCell
            colSpan={1}
            align="center"
            sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}
          >
            <Typography variant="body2" fontWeight="bold">
              Homo sapiens (REF)
            </Typography>
          </TableCell>
          <TableCell
            colSpan={6}
            align="center"
            sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}
          >
            <Typography variant="body2" fontWeight="bold">
              Input List
            </Typography>
          </TableCell>
        </TableRow>

        {/* Second Header Row without sort functionality */}
        <TableRow>
          {columns.map((column, index) => (
            <TableCell
              key={column.dataKey}
              variant="head"
              align={index === 0 ? "left" : "center"}
              style={{ width: column.width }}
              sx={{ backgroundColor: "#f5f5f5" }}
            >
              <Typography variant="body2" fontWeight="bold">
                {column.label}
              </Typography>
            </TableCell>
          ))}
        </TableRow>
      </>
    );
  };

  // Row content
  const rowContent = (_index: number, row: OverrepResultItem) => {
    return (
      <>
        {columns.map((column, index) => {
          let content: React.ReactNode = row[column.dataKey];

          // Format numeric values
          if (
            column.dataKey === "expected" ||
            column.dataKey === "foldEnrichment"
          ) {
            content = (row[column.dataKey] as number).toFixed(2);
          } else if (column.dataKey === "pValue" || column.dataKey === "fdr") {
            content = (row[column.dataKey] as number).toExponential(2);
          }

          return (
            <TableCell
              key={column.dataKey}
              align={index === 0 ? "left" : "center"}
              sx={
                column.dataKey === "overUnder"
                  ? {
                      color: row.overUnder === "+" ? "green" : "red",
                      fontWeight: "bold",
                    }
                  : {}
              }
            >
              {content}
            </TableCell>
          );
        })}
      </>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
        }}
      >
        <Typography variant="h5">Results</Typography>
        <Box>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetAnalysis}
            sx={{ mr: 2 }}
          >
            Back to Input
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleDownloadCSV}
            sx={{ mr: 2 }}
            disabled={!response}
          >
            Download All Mappings
          </Button>
          <Button variant="contained" color="primary" onClick={submitToPanther}>
            View Full Results in PANTHER
          </Button>
        </Box>
      </Box>

      {/* Overrepresentation Results Table */}
      {tableData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          {/* Filter information and toggle */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {showAllResults
                ? "Showing All Results"
                : correctionType === CorrectionType.FDR
                ? "Showing only results with FDR P < 0.05"
                : correctionType === CorrectionType.BONFERRONI
                ? "Showing only results with Bonferroni-corrected for P < 0.05"
                : "Showing only results with P value < 0.05"}
            </Typography>
            <Typography
              variant="body2"
              fontWeight="medium"
              color="primary"
              sx={{ mr: 2 }}
            >
              ({displayData.length} of {tableData.length} results)
            </Typography>
            <Button
              onClick={() => setShowAllResults(!showAllResults)}
              sx={{
                textTransform: "none",
                minWidth: "auto",
                padding: "2px 8px",
                fontSize: "0.875rem",
                fontWeight: "medium",
              }}
              color="primary"
            >
              {showAllResults
                ? "Show Significant Only"
                : "Click here to show all"}
            </Button>
          </Box>

          <Paper sx={{ height: 500, width: "100%" }}>
            <TableVirtuoso
              data={displayData}
              components={VirtuosoTableComponents}
              fixedHeaderContent={fixedHeaderContent}
              itemContent={rowContent}
            />
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default ResultDisplay;
