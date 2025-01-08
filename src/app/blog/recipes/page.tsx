import TextPage from "@/src/components/layout/Textpage";
import { getPosts } from '@/src/lib/posts';
import Link from 'next/link';
import { Deck, CardInformationProps } from "@/src/components/cards/Deck";
import "@/src/styles/Blog.css";
import "@/src/styles/Markdown.css";

export default async function AllRecipes() {
  const recipes = await getPosts('recipes');
  
  const cardData: CardInformationProps[] = recipes.map((recipe) => ({
    title: recipe.title,
    subtitle: new Date(recipe.date).toLocaleDateString(),
    content: recipe.excerpt || 'A recipe by Gabriel Husain',
    link: `/blog/recipes/${recipe.slug}`
  }));

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

        <Deck cards={cardData} />
      </div>
    </TextPage>
  );
}