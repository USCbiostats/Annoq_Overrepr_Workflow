import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";
import { RELEASES } from "../news";

const News: React.FC = () => {
  const { hash } = useLocation();

  // React Router does not scroll to a #release-x.y.z anchor on its own.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash]);

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
            Release Information
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            New features and changes in each SNPWay release. The SNPWay version
            behind a run is written at the top of every download.
          </Typography>

          <TableContainer sx={{ mt: 2 }}>
            <Table aria-label="SNPWay releases">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RELEASES.map((release) => (
                  <TableRow
                    key={release.version}
                    id={`release-${release.version}`}
                    sx={{ verticalAlign: "top" }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {release.date}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>{release.title}</TableCell>
                    <TableCell>{release.version}</TableCell>
                    <TableCell sx={{ minWidth: 280 }}>
                      {release.sections.map((section) => (
                        <Box key={section.heading} sx={{ mb: 1.5 }}>
                          <Typography variant="subtitle2" component="h2">
                            {section.heading}
                          </Typography>
                          <Box
                            component="ul"
                            sx={{ mt: 0.5, mb: 0, pl: 2.5 }}
                          >
                            {section.items.map((item) => (
                              <Typography
                                key={item}
                                component="li"
                                variant="body2"
                                sx={{ mb: 0.5 }}
                              >
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default News;
