import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <BrandHeader />
      <TopBar />
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            textAlign: "center",
            my: 4,
          }}
        >
          <Typography variant="h1" component="h1" gutterBottom>
            404
          </Typography>
          <Typography variant="h4" component="h2" gutterBottom>
            Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The page you are looking for doesn't exist or has been moved.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/")}
            sx={{ mt: 2 }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
      <Footer />
    </>
  );
};

export default NotFound;
