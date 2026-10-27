import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Tutorial from "./pages/Tutorial";
import API from "./pages/API";
import ResultsInterpretation from "./pages/ResultsInterpretation";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme/theme";
import CssBaseline from "@mui/material/CssBaseline";
import { trackPageView } from "./analytics";

function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* A new key on every navigation to "/" (Home link, logo) remounts the
            page, so it always opens on the landing page with a reset form. */}
        <Route path="/" element={<Home key={location.key} />} />
        <Route path="/about" element={<About />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route
          path="/tutorial/results-interpretation"
          element={<ResultsInterpretation />}
        />
        <Route path="/api" element={<API />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
