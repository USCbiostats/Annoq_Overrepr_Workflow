import { Box, Button, Container, Stack } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

export default function TopBar() {
  const { pathname } = useLocation();

  const linkStyles = (path: string) => ({
    color: "primary.contrastText",
    fontWeight: pathname === path ? 700 : 600,
    borderBottom:
      pathname === path ? "2px solid #ffffff" : "2px solid transparent",
    borderRadius: 0,
    px: 2,
    minWidth: 0,
  });

  return (
    <Box
      component="nav"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "primary.main",
        boxShadow: "inset 0 -1px 0 rgba(18, 53, 91, 0.08)",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={4}
          sx={{ py: { xs: 1.5, md: 2 } }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={Link}
              to="/"
              variant="text"
              size="medium"
              disableRipple
              sx={linkStyles("/")}
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/about"
              variant="text"
              size="medium"
              disableRipple
              sx={linkStyles("/about")}
            >
              About
            </Button>
            <Button
              component={Link}
              to="/contact"
              variant="text"
              size="medium"
              disableRipple
              sx={linkStyles("/contact")}
            >
              Support
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
