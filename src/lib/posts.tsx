import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

export interface Post {
  date: Date;
  slug: string;
  title: string;
  type: 'posts' | 'recipes';
}

const DIRECTORIES = {
  posts: path.join(process.cwd(), 'src', 'app', 'blog', 'posts'),
  recipes: path.join(process.cwd(), 'src', 'app', 'blog', 'recipes')
} as const;

export const getPosts = cache(async (type?: 'posts' | 'recipes'): Promise<Post[]> => {
  const processDirectory = async (dirType: 'posts' | 'recipes') => {
    const filenames = await fs.readdir(DIRECTORIES[dirType]);
    
    return Promise.all(
      filenames
        .filter(filename => filename.endsWith('.md'))
        .map(async filename => {
          const [year, month, day, ...slugParts] = filename.replace('.md', '').split('-');
          const date = new Date(`${year}-${month}-${day}T12:00:00-05:00`);
            const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          return {
            date: estDate,
            slug: slugParts.join('-'),
            title: slugParts.join(' ').replace(/-/g, ' '),
            type: dirType
          };
        })
    );
  };

  if (type) {
    return (await processDirectory(type)).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  const allPosts = await Promise.all([
    processDirectory('posts'),
    processDirectory('recipes')
  ]);

  return allPosts
    .flat()
    .sort((a, b) => b.date.getTime() - a.date.getTime());
});