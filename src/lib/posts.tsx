import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

export interface Post {
  date: Date;
  slug: string;
  title: string;
  type: 'posts' | 'recipes';
  excerpt?: string; // Optional to maintain compatibility with existing components
}

const DIRECTORIES = {
  posts: path.join(process.cwd(), 'src', 'app', 'blog', 'posts'),
  recipes: path.join(process.cwd(), 'src', 'app', 'blog', 'recipes')
} as const;

const getExcerpt = async (filePath: string): Promise<string> => {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Skip YAML frontmatter if it exists
  let startIndex = 0;
  if (lines[0]?.trim() === '---') {
    const endIndex = lines.findIndex((line, idx) => idx > 0 && line.trim() === '---');
    startIndex = endIndex + 1;
  }
  
  // Get content after frontmatter
  const contentText = lines.slice(startIndex)
    .filter(line => line.trim() !== '')
    .join(' ')
    .trim();
    
  // Limit to 75 characters and add ellipsis if needed
  return contentText.length > 75 
    ? `${contentText.slice(0, 75)}...` 
    : contentText;
};

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
          
          // Get excerpt from file
          const filePath = path.join(DIRECTORIES[dirType], filename);
          const excerpt = await getExcerpt(filePath);
          
          return {
            date: estDate,
            slug: slugParts.join('-'),
            title: slugParts.join(' ').replace(/-/g, ' '),
            type: dirType,
            excerpt
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