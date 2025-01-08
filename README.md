# Gabriel's Vercel website

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

I'd prefer you ran it with npm run build and then npm start
there's some issues with animations in dev, probably because its partial hydration

## Project Structure

```
├── src/
│   ├── app/                   # App router directory
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility functions
│   ├── types/                 # TypeScript types
│   └── styles/                # Component styles
├── public/                    # Static files
└── config/                    # Configuration files
```
