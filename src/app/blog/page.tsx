import TextPage from "@/src/components/layout/Textpage";
import RecentPosts from "@/src/components/automation/RecentPosts";
import Link from 'next/link';
import Image from 'next/image';
import "@/src/styles/Blog.css";
import "@/src/styles/Markdown.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Blog & Recipes'
};

export default function Blog() {
  return (
    <TextPage>
      <div className="wrapper multiline">
        <h1 className="title">Blog & Recipes</h1>

        <div className="recent-posts-container">
          <div className="recent-posts-section">
            <h2 className="subtitle">Blog</h2>
            <Link href="https://gab-site.vercel.app/" target="_blank" rel="noopener noreferrer" className="post-preview" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image src="/images/gabbsite.svg" alt="Blog Icon" width={24} height={24} style={{ objectFit: 'contain' }} />
                <div>
                  <h3>Blog Has Moved!</h3>
                  <p>The blog content has been moved to a new location. Click to visit the new blog site.</p>
                </div>
              </div>
            </Link>
          </div>

          <RecentPosts type="recipes">
            <h2 className="subtitle">Recent Recipes</h2>
          </RecentPosts>
        </div>

      </div>
    </TextPage>
  );
}
