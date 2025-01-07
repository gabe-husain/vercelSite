import type { Config } from "tailwindcss";

// We define our color variables in a type-safe way
const colors = {
  // These are defined in globals.css

  //light mode colors
  "background-light": "var(--background-light)",
  "text-light": "var(--text-light)",
  //dark mode colors
  "background-dark": "var(--background-dark)",
  "text-dark": "var(--text-dark)",
  
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
} as const;

const config: Config = {
  // The content configuration tells Tailwind which files to scan for classes
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{html,js,tsx,ts,jsx,mdx}",
  ],

  // Theme configuration extends Tailwind's default theme
  theme: {
    extend: {

      //
      //  Using shadcn/ui tailwind config
      //

      colors,

      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },

      //
      //  end shadcn/ui tailwind config
      //

      // Adding some useful screen breakpoints for responsive design
      screens: {
        xs: "475px",
        // Default breakpoints are already included:
        // 'sm': '640px',
        // 'md': '768px',
        // 'lg': '1024px',
        // 'xl': '1280px',
        // '2xl': '1536px',
      },

      // Adding useful container constraints
      maxWidth: {
        readable: "65ch",
        container: "1440px",
      },
    },
  },

  // Using media queries for dark mode
  // 'media' means it follows system preferences
  // 'class' would allow manual toggling
  darkMode: "media",

  // No plugins are currently needed, but this is where you'd add them
  plugins: [],

  // Additional safelist for dynamically generated classes
  safelist: [
    {
      pattern: /^(bg|text|border)-(background|text)-(light|dark)/,
    },
  ],
  
};

export default config;
