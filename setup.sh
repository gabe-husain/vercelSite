#!/bin/zsh

# Create all directories
mkdir -p src/{app/{routes},components/{ui,layout},lib,types,styles} public/{images,fonts} config

# Create and populate layout.tsx
cat > src/app/layout.tsx << 'EOL'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your Name - Portfolio',
  description: 'Personal website and portfolio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOL

# Create and populate page.tsx
cat > src/app/page.tsx << 'EOL'
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">Welcome to My Portfolio</h1>
    </main>
  )
}
EOL

# Create and populate globals.css
cat > src/app/globals.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

# Create and populate Button component
cat > src/components/ui/Button.tsx << 'EOL'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors"
  const variantStyles = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800"
  }
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}
EOL

# Create and populate tailwind.config.js
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL

# Create and populate next.config.js
cat > next.config.js << 'EOL'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-image-domain.com'], // Add domains for external images
  },
}

module.exports = nextConfig
EOL

# Create and populate .gitignore
cat > .gitignore << 'EOL'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOL

# Create and populate .env.example
cat > .env.example << 'EOL'
# Environment variables
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOL

# Create empty .env.local
touch .env.local

# Create and populate README.md
cat > README.md << 'EOL'
# Your Next.js Portfolio

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── src/
│   ├── app/                    # App router directory
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility functions
│   ├── types/                 # TypeScript types
│   └── styles/                # Component styles
├── public/                    # Static files
└── config/                    # Configuration files
```
EOL

echo "Project structure and files created successfully!"