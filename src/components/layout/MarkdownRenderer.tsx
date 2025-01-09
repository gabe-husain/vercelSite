import React from 'react';
import ReactMarkdown from 'react-markdown';
import "@/src/styles/Markdown.css";
import rehypeRaw from "rehype-raw";

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
  <div className='base'>
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{children}</ReactMarkdown>
  </div>
  );
}
