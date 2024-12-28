// src/lib/posts.ts
import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

export interface Post {
  date: Date;
  slug: string;
  title: string;
}

export const getPosts = cache(async (): Promise<Post[]> => {
  const postsDirectory = path.join(process.cwd(), 'src', 'app', 'blog', 'posts');
  const filenames = await fs.readdir(postsDirectory);
  
  const posts = await Promise.all(
    filenames
      .filter(filename => filename.endsWith('.md'))
      .map(async filename => {
        const [year, month, day, ...slugParts] = filename.replace('.md', '').split('-');
        
        return {
          date: new Date(`${year}-${month}-${day}`),
          slug: slugParts.join('-'),
          title: slugParts.join(' ').replace(/-/g, ' ')
        };
      })
  );
  
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
});