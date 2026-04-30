import React from "react";
import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";
import GitHubIcon from "@mui/icons-material/GitHub";

const Contact: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <BrandHeader />
      <TopBar />

      <Container
        component="main"
        maxWidth="lg"
        sx={{ mt: 4, mb: 6, flexGrow: 1 }}
      >
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: { xs: 3, md: 4 },
            bgcolor: "white",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 1 }}>
            Contact and Support
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We welcome feedback, issues, and collaboration. The GitHub tracker
            is the fastest way to reach us.
          </Typography>

          <Stack spacing={1} sx={{ mt: 2, mb: 3 }}>
            <Typography variant="h6">Documentation</Typography>
            <Typography variant="body2">
              User tutorial and results interpretation: <Link component={RouterLink} to="/tutorial">Tutorial</Link>
            </Typography>
            <Typography variant="body2">
              API endpoint and integration examples: <Link component={RouterLink} to="/api">API Guide</Link>
            </Typography>
          </Stack>

          <Stack
            spacing={2}
            direction={{ xs: "column", sm: "row" }}
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <GitHubIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h6">GitHub repository</Typography>
              <Typography variant="body2" color="text.secondary">
                Submit issues, feature requests, or pull requests here:
              </Typography>
              <Link
                href="https://github.com/USCbiostats/Annoq_Overrepr_Workflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/USCbiostats/Annoq_Overrepr_Workflow
              </Link>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            This open-source project is maintained by researchers at the
            University of Southern California.
          </Typography>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default Contact;
