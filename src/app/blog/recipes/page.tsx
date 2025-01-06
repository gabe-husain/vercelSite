import TextPage from "@/src/components/layout/Textpage";
import { getPosts } from '@/src/lib/posts';
import Link from 'next/link';
import "@/src/styles/Blog.css";
import "@/src/styles/Markdown.css";

export default async function AllRecipes() {
  const recipes = await getPosts('recipes');

  return (
    <TextPage>
      <div className="wrapper multiline">
        <title>All Recipes</title>

        <div className="posts-header">
          <h1 className="title">All Recipes</h1>
          <Link href="/blog" className="back-link">
            ← Back to Blog
          </Link>
        </div>

        <div className="all-posts-list">
          {recipes.map((recipe) => (
            <Link 
              href={`/blog/recipes/${recipe.slug}`} 
              key={recipe.slug}
              className="post-link"
            >
              <div className="post-preview">
                <h3>{recipe.title}</h3>
                <time>{new Date(recipe.date).toLocaleDateString()}</time>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </TextPage>
  );
}