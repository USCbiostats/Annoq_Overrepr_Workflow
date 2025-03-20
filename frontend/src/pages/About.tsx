import React from "react";
import { Box, Container, Typography, Paper, Link } from "@mui/material";
import TopBar from "../components/TopBar";
import Footer from "../components/Footer";

const About: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />

      <Container component="main" sx={{ mt: 8, mb: 8, flexGrow: 1 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            About This Project
          </Typography>

          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            This is an open-source tool designed to help researchers efficiently
            conduct overrepresentation tests for genes using a list of SNPs.
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
            How It Works
          </Typography>
          <Typography variant="body1" paragraph>
            Our platform integrates two powerful tools:
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              mt: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  <Link
                    href="https://annoq.org/"
                    target="_blank"
                    rel="noopener"
                  >
                    Annoq
                  </Link>
                </Typography>
                <Typography variant="body2">
                  We use{" "}
                  <Link
                    href="https://annoq.org/"
                    target="_blank"
                    rel="noopener"
                  >
                    Annoq
                  </Link>{" "}
                  to retrieve genes corresponding to your list of SNPs.
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  <Link
                    href="https://pantherdb.org/"
                    target="_blank"
                    rel="noopener"
                  >
                    PANTHER
                  </Link>
                </Typography>
                <Typography variant="body2">
                  Once genes are identified, we use{" "}
                  <Link
                    href="https://pantherdb.org/"
                    target="_blank"
                    rel="noopener"
                  >
                    PANTHER
                  </Link>{" "}
                  to run an overrepresentation test.
                </Typography>
              </Paper>
            </Box>
          </Box>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
            Contact
          </Typography>
          <Typography variant="body1" paragraph>
            If you have questions or need assistance with using this tool, feel
            free to reach out to our team.
          </Typography>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
};

export default About;
