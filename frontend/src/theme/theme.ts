import { createTheme } from '@mui/material/styles';

// Custom theme with medium blue primary color
const theme = createTheme({
  palette: {
    primary: {
      main: '#2c5282', // Medium Blue - lighter than previous
      light: '#4f75a8', // Lighter variant
      dark: '#1a365d', // Darker variant
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#718096', // Slate - complementary to medium blue
      light: '#a0aec0', // Lighter slate
      dark: '#4a5568', // Darker slate
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
