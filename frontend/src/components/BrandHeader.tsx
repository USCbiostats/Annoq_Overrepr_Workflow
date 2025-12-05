import { Box, Container, Link, Stack, Typography } from "@mui/material";
import Logo from "../../public/SNPWay_logo.svg";

const BrandHeader = () => {
  return (
    <Box
      sx={{
        backgroundColor: "#eef3fb",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ py: { xs: 2.5, md: 3 } }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1.5, sm: 2.5 }}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box
              component="img"
              src={Logo}
              alt="SNPWay logo"
              sx={{
                height: { xs: 72, sm: 88 },
                width: "auto",
                objectFit: "contain",
                backgroundColor: "white",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.5,
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            />
            <Box>
              <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
                SNPWay
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ maxWidth: 480 }}
              >
                An easy ride from SNP to function and pathway
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ pt: { xs: 0.5, md: 0 } }}
          >
            <Typography variant="body2" color="text.secondary">
              Powered by
            </Typography>
            <Link
              href="https://annoq.org/"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ fontWeight: 700 }}
            >
              AnnoQ
            </Link>
            <Typography variant="body2" color="text.secondary">
              &
            </Typography>
            <Link
              href="https://pantherdb.org/"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ fontWeight: 700 }}
            >
              PANTHER
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default BrandHeader;
