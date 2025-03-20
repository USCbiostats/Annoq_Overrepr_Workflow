import React from "react";
import {
  Box,
  Container,
  Link,
  Typography,
  List,
  ListItem,
  Stack,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { styled } from "@mui/material/styles";

const FooterContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(3),
  backgroundColor: theme.palette.primary.main,
  borderTop: `1px solid ${theme.palette.divider}`,
  color: "white", // Add white text color
}));

const LogoImage = styled("img")({
  height: "72px",
  marginBottom: "16px",
});

const FooterLink = styled(RouterLink)({
  color: "white", // Change to white
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
});

const ExternalLink = styled(Link)({
  color: "white", // Change to white
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
});

const GitHubLogo = styled("img")({
  height: "24px",
  marginRight: "8px",
  verticalAlign: "middle",
});

const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          justifyContent="space-between"
        >
          <Box sx={{ flex: 1, maxWidth: { xs: "100%", sm: "33%" } }}>
            <LogoImage src="/image-logo-yellow.gif" alt="AnnoQ Logo" />
            <Typography variant="body2">
              <strong>&copy; Copyright</strong> University of Southern
              California
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ flex: 1 }}>
            <List dense>
              <ListItem disableGutters>
                <FooterLink to="/about">About</FooterLink>
              </ListItem>
              <ListItem disableGutters>
                <FooterLink to="/contact">Contact Us</FooterLink>
              </ListItem>
              <ListItem disableGutters>
                <ExternalLink
                  href="https://github.com/USCbiostats/Annoq_Overrepr_Workflow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubLogo src="/github-mark-white.png" alt="GitHub" />
                  GitHub Repository
                </ExternalLink>
              </ListItem>
            </List>
          </Box>
        </Stack>
      </Container>
    </FooterContainer>
  );
};

export default Footer;
