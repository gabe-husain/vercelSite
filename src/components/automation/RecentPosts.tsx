import { PropsWithChildren } from "react";
import Link from 'next/link';
import { getPosts } from '@/src/lib/posts';
import "@/src/styles/RecentPosts.css"

interface RecentPostsProps extends PropsWithChildren {
  type: 'posts' | 'recipes';
}

export default async function RecentPosts({ children, type }: RecentPostsProps) {
  const posts = await getPosts(type);
  const recentPosts = posts.slice(0, 5);

  return (
    <div className="RecentPosts">
      {children}
      <div className="recent-posts-list">
        {recentPosts.map((post) => (
          <Link 
            href={`/blog/${post.type}/${post.slug}`} 
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
      <Link 
        href={`/blog/${type}`} 
        className="view-all-link"
      >
        View all {type}
      </Link>
    </div>
  );
}