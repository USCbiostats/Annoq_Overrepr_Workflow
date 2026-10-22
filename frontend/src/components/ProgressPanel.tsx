import * as React from "react";
import {
  Box,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { WorkflowStageProgress } from "../models";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  WorkflowStages,
  estimateRemaining,
  formatDuration,
  useNow,
} from "../workflowProgress";

const StageIcon: React.FC<{ status: WorkflowStageProgress["status"] }> = ({
  status,
}) => {
  if (status === "done") {
    return <CheckCircleIcon color="success" fontSize="small" />;
  }
  if (status === "failed") {
    return <ErrorIcon color="error" fontSize="small" />;
  }
  if (status === "running") {
    return <CircularProgress size={16} />;
  }
  return <RadioButtonUncheckedIcon color="disabled" fontSize="small" />;
};

// One stage: status icon, label, batch count, elapsed time, and a progress
// bar with a rough time-left estimate while it runs.
export const StageRow: React.FC<{
  label: string;
  stage: WorkflowStageProgress;
  now: number;
}> = ({ label, stage, now }) => {
  const { status, done, total, startedAt, finishedAt } = stage;
  const hasBatches = total !== null && total > 0;
  const elapsed =
    startedAt !== null ? formatDuration((finishedAt ?? now) - startedAt) : null;
  const remaining = estimateRemaining(stage, now);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 20, display: "flex", justifyContent: "center" }}>
          <StageIcon status={status} />
        </Box>
        <Typography
          variant="body2"
          sx={{ flexGrow: 1 }}
          color={status === "pending" ? "text.secondary" : "text.primary"}
        >
          {label}
        </Typography>
        {hasBatches && (
          <Typography variant="body2" color="text.secondary">
            {(done ?? 0).toLocaleString()} / {total.toLocaleString()}{" "}
            {total === 1 ? "batch" : "batches"}
          </Typography>
        )}
        {elapsed && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 48, textAlign: "right" }}
          >
            {elapsed}
          </Typography>
        )}
      </Stack>
      {status === "running" && (
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ pl: 4, mt: 0.5 }}
        >
          <LinearProgress
            sx={{ flexGrow: 1 }}
            variant={hasBatches ? "determinate" : "indeterminate"}
            value={hasBatches ? ((done ?? 0) / total) * 100 : undefined}
          />
          {remaining && (
            <Typography variant="caption" color="text.secondary">
              {remaining}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export type ProgressPanelProps = {
  stages: WorkflowStages;
  startedAt: number;
};

// Shows each workflow stage with its status, batch progress and timing.
const ProgressPanel: React.FC<ProgressPanelProps> = ({ stages, startedAt }) => {
  const now = useNow(true);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
        mb: 2,
      }}
    >
      <Stack direction="row" alignItems="baseline" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Processing your request
        </Typography>
        <Typography variant="body2" color="text.secondary">
          elapsed {formatDuration(now - startedAt)}
        </Typography>
      </Stack>
      <Stack spacing={1.25}>
        {STAGE_ORDER.map((name) => {
          const stage = stages[name];
          return stage ? (
            <StageRow key={name} label={STAGE_LABELS[name]} stage={stage} now={now} />
          ) : null;
        })}
      </Stack>
    </Box>
  );
};

export default ProgressPanel;
