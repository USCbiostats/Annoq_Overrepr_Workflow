import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export type HelpTipProps = {
  // Accessible name for the icon button, e.g. "About the reference list".
  label: string;
  children: React.ReactNode;
};

// An info icon that shows guidance on hover, keyboard focus, or tap.
const HelpTip: React.FC<HelpTipProps> = ({ label, children }) => (
  <Tooltip
    arrow
    placement="right-start"
    enterTouchDelay={0}
    leaveTouchDelay={8000}
    title={<Box sx={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>{children}</Box>}
    slotProps={{ tooltip: { sx: { maxWidth: 380, p: 1.5 } } }}
  >
    <IconButton size="small" aria-label={label} sx={{ p: 0.25 }}>
      <InfoOutlinedIcon fontSize="small" color="action" />
    </IconButton>
  </Tooltip>
);

// A compact bulleted list for use inside a HelpTip.
export const TipList: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </Box>
);

export default HelpTip;
