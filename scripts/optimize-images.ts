import sharp from 'sharp'
import { readdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function optimizeImages() {
  // Define image directory relative to project root
  const imageDir = path.join(__dirname, '../public/images')
  
  try {
    // Read all files in the images directory
    const files = await readdir(imageDir)
    
    for (const file of files) {
      // Only process image files
      if (file.match(/\.(jpg|jpeg|png)$/i)) {
        console.log(`Optimizing ${file}...`)
        
        // Create WebP version
        await sharp(path.join(imageDir, file))
          .webp({ quality: 80 })
          .toFile(path.join(imageDir, `${file.split('.')[0]}.webp`))
        
        // Create AVIF version
        await sharp(path.join(imageDir, file))
          .avif({ quality: 65 })
          .toFile(path.join(imageDir, `${file.split('.')[0]}.avif`))
          
        // Optimize original
        await sharp(path.join(imageDir, file))
          .jpeg({ quality: 80 })
          .toFile(path.join(imageDir, `${file.split('.')[0]}.optimized.jpg`))
      }
    }
    
    console.log('Image optimization complete!')
  } catch (error) {
    console.error('Error optimizing images:', error)
  }
}

optimizeImages()