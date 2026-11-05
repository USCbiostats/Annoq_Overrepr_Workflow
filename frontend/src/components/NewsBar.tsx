import { Box, Chip, Container, Link, Typography } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { Link as RouterLink } from "react-router-dom";
import { LATEST_RELEASE, newsBarStyle } from "../news";

// Announcement bar under the top menu, linking to the latest release on the
// News page. While the latest release is a beta (the TOPMed deployment), the
// bar is light yellow with a BETA label so users know they are on a beta and
// on a different dataset from the HRC SNPWay.
export default function NewsBar() {
  const style = newsBarStyle(LATEST_RELEASE);
  const Icon = style.showBeta ? WarningAmberOutlinedIcon : CampaignOutlinedIcon;
  return (
    <Box
      role="region"
      aria-label="SNPWay news"
      sx={{
        bgcolor: style.bgcolor,
        borderBottom: "1px solid",
        borderColor: style.borderColor,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="body2"
          sx={{
            py: 0.75,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            color: "primary.dark",
          }}
        >
          <Icon fontSize="small" aria-hidden />
          {style.showBeta && (
            <Chip
              label="BETA"
              size="small"
              sx={{ bgcolor: "#e9bd30", color: "#000", fontWeight: 700, height: 20 }}
            />
          )}
          <span>
            <strong>SNPWay {LATEST_RELEASE.version} released</strong>
            {` (${LATEST_RELEASE.date}): ${LATEST_RELEASE.title}.`}
          </span>
          <Link
            component={RouterLink}
            to={`/news#release-${LATEST_RELEASE.version}`}
            sx={{ fontWeight: 600 }}
          >
            See what&apos;s new
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
