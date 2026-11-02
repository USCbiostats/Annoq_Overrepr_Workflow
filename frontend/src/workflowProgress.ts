import { useEffect, useState } from "react";
import {
    WorkflowStageEvent,
    WorkflowStageName,
    WorkflowStageProgress,
} from "./models";

export type WorkflowStages = Partial<Record<WorkflowStageName, WorkflowStageProgress>>;

export const STAGE_ORDER: WorkflowStageName[] = [
    "input",
    "reference",
    "overrepresentation",
    "gene_details",
];

export const STAGE_LABELS: Record<WorkflowStageName, string> = {
    input: "Mapping input list to genes (AnnoQ)",
    reference: "Mapping reference list to genes (AnnoQ)",
    overrepresentation: "Running PANTHER overrepresentation test",
    gene_details: "PANTHER gene mapping (for downloads)",
};

// Folds one stage event from the stream into the client-side stage state.
export const applyStageEvent = (
    stages: WorkflowStages,
    event: WorkflowStageEvent,
    now: number
): WorkflowStages => {
    const current = stages[event.stage];
    const finished = event.status === "done" || event.status === "failed";
    return {
        ...stages,
        [event.stage]: {
            status: event.status,
            done: event.done ?? current?.done ?? null,
            total: event.total ?? current?.total ?? null,
            startedAt:
                current?.startedAt ?? (event.status === "running" ? now : null),
            finishedAt: finished ? now : null,
        },
    };
};

export const formatDuration = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Rough time left from the average time per finished batch so far.
export const estimateRemaining = (
    stage: WorkflowStageProgress,
    now: number
): string | null => {
    const { done, total, startedAt } = stage;
    if (stage.status !== "running" || !startedAt || !done || !total || done >= total) {
        return null;
    }
    const remainingMs = ((now - startedAt) / done) * (total - done);
    if (remainingMs < 60_000) {
        return "less than a minute left";
    }
    return `~${Math.round(remainingMs / 60_000)} min left`;
};

// Current time, refreshed every second while active, for elapsed/ETA displays.
export const useNow = (active: boolean): number => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) {
            return;
        }
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [active]);
    return now;
};
