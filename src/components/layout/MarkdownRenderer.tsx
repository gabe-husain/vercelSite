import React from 'react';
import ReactMarkdown from 'react-markdown';
import "@/src/styles/Markdown.css";

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
  <div className='base'>
    <ReactMarkdown>{children}</ReactMarkdown>
  </div>
  );
}
