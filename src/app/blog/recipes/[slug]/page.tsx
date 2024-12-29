import { notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import MarkdownRenderer from '@/src/components/layout/MarkdownRenderer';
import { getPosts } from '@/src/lib/posts';

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  
  const posts = await getPosts('recipes'); 
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }

  const directory = path.join(process.cwd(), 'src', 'app', 'blog', post.type);
  const markdownContent = await fs.readFile(
    path.join(directory, `${post.date.toISOString().split('T')[0]}-${post.slug}.md`),
    'utf8'
  );

  return (
    <div className="textPage">
      <MarkdownRenderer>{markdownContent}</MarkdownRenderer>
    </div>
  );
}