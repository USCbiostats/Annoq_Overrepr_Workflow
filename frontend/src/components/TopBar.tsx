import { Box, Button, Container, Stack } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const linkStyles = (path: string) => ({
    color: pathname === path ? "primary.dark" : "text.primary",
    fontWeight: pathname === path ? 700 : 600,
    borderBottom:
      pathname === path ? "2px solid #12355b" : "2px solid transparent",
    borderRadius: 0,
    px: 0,
    minWidth: 0,
  });

  return (
    <Box
      component="nav"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "#dfe7f3",
        boxShadow: "inset 0 -1px 0 rgba(18, 53, 91, 0.08)",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={4}
          sx={{ py: { xs: 1, md: 1.25 } }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={Link}
              to="/"
              variant="text"
              size="small"
              disableRipple
              sx={linkStyles("/")}
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/about"
              variant="text"
              size="small"
              disableRipple
              sx={linkStyles("/about")}
            >
              About
            </Button>
            <Button
              component={Link}
              to="/contact"
              variant="text"
              size="small"
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
