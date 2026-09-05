import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { initMinioBucket, uploadToMinio, PUBLIC_URL_BASE } from '../utils/minio';
import ProductModel from '../app/products/model';

dotenv.config();

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function cleanImageFilename(rawPath: string): string {
  if (!rawPath) return '';
  const cleaned = rawPath.trim().split('?')[0];
  const parts = cleaned.split(/[/\\]/);
  return parts[parts.length - 1];
}

async function migrate() {
  console.log('=== Step 1: Initializing MinIO Bucket & Policy ===');
  await initMinioBucket();

  console.log('\n=== Step 2: Uploading Local Images to MinIO ===');
  const imagesDir = path.join(__dirname, '../public/images');
  if (!fs.existsSync(imagesDir)) {
    console.error(`Images directory not found at: ${imagesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir);
  console.log(`Found ${files.length} files in ${imagesDir}`);

  let uploadSuccessCount = 0;
  let uploadFailCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(imagesDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      try {
        const buffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(file);

        // Upload both to images/file and file for universal path matching
        await uploadToMinio(buffer, `images/${file}`, mimeType);
        await uploadToMinio(buffer, file, mimeType);

        uploadSuccessCount++;
        if ((i + 1) % 25 === 0 || i + 1 === files.length) {
          console.log(`Uploaded ${i + 1}/${files.length} images to MinIO...`);
        }
      } catch (err) {
        console.error(`Failed to upload ${file}:`, err);
        uploadFailCount++;
      }
    }
  }

  console.log(`Upload summary: ${uploadSuccessCount} succeeded, ${uploadFailCount} failed.`);

  console.log('\n=== Step 3: Updating MongoDB Product Image URLs ===');
  const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
  
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.');

  const products = await ProductModel.find({});
  console.log(`Found ${products.length} products to check and migrate.`);

  let updatedProductsCount = 0;

  for (const product of products) {
    let modified = false;

    // Handle image_thumbnail
    if (product.image_thumbnail && !product.image_thumbnail.startsWith(PUBLIC_URL_BASE)) {
      const filename = cleanImageFilename(product.image_thumbnail);
      if (filename) {
        product.image_thumbnail = `${PUBLIC_URL_BASE}/images/${filename}`;
        modified = true;
      }
    }

    // Handle image_details array
    if (Array.isArray(product.image_details)) {
      const updatedDetails = product.image_details.map((detail) => {
        if (detail && !detail.startsWith(PUBLIC_URL_BASE)) {
          const filename = cleanImageFilename(detail);
          if (filename) {
            modified = true;
            return `${PUBLIC_URL_BASE}/images/${filename}`;
          }
        }
        return detail;
      });
      product.image_details = updatedDetails;
    }

    if (modified) {
      await product.save();
      updatedProductsCount++;
    }
  }

  console.log(`Product migration complete: ${updatedProductsCount} products updated with MinIO URLs.`);

  console.log('\n=== Migration to MinIO Finished Successfully ===');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
