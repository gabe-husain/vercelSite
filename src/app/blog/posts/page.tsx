import TextPage from "@/src/components/layout/Textpage";
import { getPosts } from '@/src/lib/posts';
import Link from 'next/link';
import "@/src/styles/Blog.css";
import "@/src/styles/Markdown.css";

export default async function AllPosts() {
  const posts = await getPosts('posts');

  return (
    <TextPage>
      <div className="wrapper multiline">
        <title>All Blog Posts</title>

        <div className="posts-header">
          <h1 className="title">All Blog Posts</h1>
          <Link href="/blog" className="back-link">
            ← Back to Blog
          </Link>
        </div>

        <div className="all-posts-list">
          {posts.map((post) => (
            <Link 
              href={`/blog/posts/${post.slug}`} 
              key={post.slug}
              className="post-link"
            >
              <div className="post-preview">
                <h3>{post.title}</h3>
                <time>{new Date(post.date).toLocaleDateString()}</time>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </TextPage>
  );
}