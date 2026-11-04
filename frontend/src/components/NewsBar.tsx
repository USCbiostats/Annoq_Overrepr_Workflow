import { Box, Container, Link, Typography } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import { Link as RouterLink } from "react-router-dom";
import { LATEST_RELEASE } from "../news";

// Announcement bar under the top menu, linking to the latest release on the
// News page.
export default function NewsBar() {
  return (
    <Box
      role="region"
      aria-label="SNPWay news"
      sx={{
        bgcolor: "#e8eff7",
        borderBottom: "1px solid",
        borderColor: "divider",
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
          <CampaignOutlinedIcon fontSize="small" aria-hidden />
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
