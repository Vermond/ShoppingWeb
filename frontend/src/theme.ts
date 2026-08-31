import { extendTheme } from "@mui/material/styles";

export const theme = extendTheme({
  cssVarPrefix: "morrow",
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#1f211e",
          contrastText: "#f7f7f3",
        },
        secondary: {
          main: "#df6d45",
          contrastText: "#1f211e",
        },
        background: {
          default: "#f7f7f3",
          paper: "#f5f5ef",
        },
        text: {
          primary: "#1f211e",
          secondary: "#787a72",
        },
        divider: "#dedfd9",
      },
    },
  },
  spacing: 4,
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: "var(--font-body)",
    button: {
      fontFamily: "var(--font-body)",
      fontSize: "11px",
      fontWeight: 400,
      lineHeight: 1.5,
      textTransform: "none",
    },
    h1: {
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      letterSpacing: "-.065em",
    },
    h2: {
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      letterSpacing: "-.065em",
    },
    h3: {
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      letterSpacing: "-.05em",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          minWidth: 0,
          borderRadius: 0,
          fontFamily: "var(--font-body)",
          fontWeight: 400,
          textTransform: "none",
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          color: "var(--morrow-palette-text-primary)",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-body)",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minWidth: 0,
          fontFamily: "var(--font-body)",
          fontWeight: 400,
          textTransform: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: "var(--font-body)",
        },
      },
    },
  },
});
