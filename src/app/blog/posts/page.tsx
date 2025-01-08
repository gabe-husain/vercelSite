import TextPage from "@/src/components/layout/Textpage";
import { getPosts } from '@/src/lib/posts';
import Link from 'next/link';
import { Deck, CardInformationProps } from "@/src/components/cards/Deck";
import "@/src/styles/Blog.css";
import "@/src/styles/Markdown.css";

export default async function AllPosts() {
  const posts = await getPosts('posts');
  
  const cardData: CardInformationProps[] = posts.map((post) => ({
    title: post.title,
    subtitle: new Date(post.date).toLocaleDateString(),
    content: post.excerpt || 'A blog post by Gabriel Husain',
    link: `/blog/posts/${post.slug}`
  }));

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

        <Deck cards={cardData} />
      </div>
    </TextPage>
  );
}