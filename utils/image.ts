import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { uploadToMinio, PUBLIC_URL_BASE } from './minio';

export interface ProcessedImageResult {
    filename: string;
    url: string;
}

const getImagesDir = (): string => {
    const cwdDir = path.resolve(process.cwd(), 'public/images');
    if (fs.existsSync(cwdDir)) return cwdDir;
    const rel1 = path.resolve(__dirname, '../public/images');
    if (fs.existsSync(rel1)) return rel1;
    const rel2 = path.resolve(__dirname, '../../public/images');
    if (fs.existsSync(rel2)) return rel2;
    fs.mkdirSync(cwdDir, { recursive: true });
    return cwdDir;
};

/**
 * Converts uploaded image to compressed WebP format and uploads to MinIO & local public/images.
 * Safe fallback: If Postman or any other client uploads PNG/JPEG/etc., it is guaranteed to become WebP.
 *
 * @param file Multer uploaded file object
 * @param options max dimensions and compression quality (0-100)
 */
export async function processAndUploadImage(
    file: Express.Multer.File,
    options?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
    }
): Promise<ProcessedImageResult> {
    const maxWidth = options?.maxWidth || 1200;
    const maxHeight = options?.maxHeight || 1200;
    const quality = options?.quality || 85;

    const tmp_path = file.path;
    const rawBuffer = fs.readFileSync(tmp_path);

    // Convert any input format (PNG, JPG, BMP, uncompressed WebP, etc.) to compressed WebP
    const processedBuffer = await sharp(rawBuffer)
        .rotate() // auto-rotate based on EXIF orientation
        .resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

    // Ensure extension is always .webp
    const filename = `${file.filename}.webp`;
    const targetDir = getImagesDir();
    const targetPath = path.join(targetDir, filename);

    // Save to local public/images directory
    fs.writeFileSync(targetPath, processedBuffer);

    // Upload to MinIO bucket
    let url = `/${filename}`;
    try {
        await uploadToMinio(processedBuffer, `images/${filename}`, 'image/webp');
        await uploadToMinio(processedBuffer, filename, 'image/webp');
        url = `${PUBLIC_URL_BASE}/images/${filename}`;
    } catch (err) {
        console.error('[MinIO] Upload error for processed WebP image:', err);
    }

    // Clean up temporary multer upload file
    try {
        if (fs.existsSync(tmp_path)) {
            fs.unlinkSync(tmp_path);
        }
    } catch (cleanupErr) {
        console.warn('[Cleanup] Failed to remove tmp file:', cleanupErr);
    }

    return {
        filename,
        url,
    };
}
