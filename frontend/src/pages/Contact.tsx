import React from "react";
import { Box, Container, Typography, Paper, Link, Stack } from "@mui/material";
import TopBar from "../components/TopBar";
import Footer from "../components/Footer";
import GitHubIcon from "@mui/icons-material/GitHub";

const Contact: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />

      <Container component="main" sx={{ mt: 8, mb: 8, flexGrow: 1 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Contact Us
          </Typography>

          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            We welcome your feedback, questions, and suggestions about this
            tool. The best way to reach us is through our GitHub repository.
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 4 }}>
            <Paper elevation={2} sx={{ p: 4, maxWidth: 500 }}>
              <Stack spacing={2} alignItems="center">
                <GitHubIcon sx={{ fontSize: 60 }} />
                <Typography variant="h6" gutterBottom>
                  GitHub Repository
                </Typography>
                <Typography variant="body1" align="center">
                  Please submit issues, feature requests, or contributions
                  through our GitHub repository:
                </Typography>
                <Link
                  href="https://github.com/USCbiostats/Annoq_Overrepr_Workflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 1 }}
                >
                  github.com/USCbiostats/Annoq_Overrepr_Workflow
                </Link>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  For bug reports, please include detailed steps to reproduce
                  the issue and any relevant error messages.
                </Typography>
              </Stack>
            </Paper>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            This is an open-source project maintained by researchers at the
            University of Southern California.
          </Typography>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
};

export default Contact;
