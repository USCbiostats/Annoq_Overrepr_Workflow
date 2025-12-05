import { Box, Container, Link, Stack, Typography } from "@mui/material";
import Logo from "../logos/SNPWay_logo.svg";
import PantherLogo from "../logos/Panther Logo.jpg";

const BrandHeader = () => {
  return (
    <Box
      sx={{
        backgroundColor: "white",
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
              }}
            />
            <Box>
              <Typography
                variant="h4"
                sx={{ lineHeight: 1.1 }}
                color="primary.main"
              >
                SNPWay
              </Typography>
              <Typography
                variant="subtitle1"
                color="primary.main"
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
              sx={{ fontWeight: 700, fontSize: "1.1rem" }}
            >
              AnnoQ
            </Link>
            <Typography variant="body2" color="text.secondary">
              &
            </Typography>
            <Box
              component="img"
              src={PantherLogo}
              alt="PANTHER logo"
              sx={{
                height: 32,
                width: "auto",
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
              onClick={() => window.open("https://pantherdb.org/", "_blank")}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default BrandHeader;
