import { createTheme } from "@mui/material/styles";

// SNPWay research-forward theme inspired by Annoq/PANTHER styling
const theme = createTheme({
  palette: {
    primary: {
      main: "#1f4c7f",
      light: "#3a6ea5",
      dark: "#12355b",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#506b87",
      light: "#6c89a5",
      dark: "#2f465c",
      contrastText: "#ffffff",
    },
    error: {
      main: "#c62828",
    },
    background: {
      default: "#f6f8fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#1b2735",
      secondary: "#4d5b6c",
    },
    divider: "#d4dde8",
  },
  typography: {
    fontFamily: '"Source Sans Pro", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
      letterSpacing: "0.01em",
    },
    h2: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
      letterSpacing: "0.01em",
    },
    h3: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Merriweather", "Source Sans Pro", serif',
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    subtitle1: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            "0px 4px 12px rgba(18, 53, 91, 0.08), 0px 1px 3px rgba(18, 53, 91, 0.06)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #d4dde8",
        },
      },
    },
  },
});

export default theme;
