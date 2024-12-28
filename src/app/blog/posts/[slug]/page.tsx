import { notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import MarkdownRenderer from '@/src/components/layout/MarkdownRenderer';
import { getPosts } from '@/src/lib/posts';

// Define the interface with Promise for params as per Next.js 14
interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: PageProps) {
  // Await the params first as it's now a Promise
  const { slug } = await params;
  
  const posts = await getPosts();
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }

  const postsDirectory = path.join(process.cwd(), 'src', 'app', 'blog', 'posts');
  const markdownContent = await fs.readFile(
    path.join(postsDirectory, `${post.date.toISOString().split('T')[0]}-${post.slug}.md`), 
    'utf8'
  );

  return (
    <div className="textPage">
      <MarkdownRenderer>{markdownContent}</MarkdownRenderer>
    </div>
  );
}

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug
  }));
}