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
  
  // shadcn/ui colors using HSL
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
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{html,js,tsx,ts,jsx,mdx}",
  ],

  theme: {
  	extend: {
  		borderRadius: {
  			lg: '`var(--radius)`',
  			md: '`calc(var(--radius) - 2px)`',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		screens: {
  			xs: '475px'
  		},
  		maxWidth: {
  			readable: '65ch',
  			container: '1440px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },

  // Changed to just 'media' since we're using @media queries
  darkMode: 'media',

  plugins: [],

  safelist: [
    {
      pattern: /^(bg|text|border)-(background|text)-(light|dark)/,
    },
  ],
};

export default config;