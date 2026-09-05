import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
const rawPort = process.env.MINIO_PORT;
const useSSL = process.env.MINIO_USE_SSL === 'true';
// Default to 443 if SSL and domain endpoint, otherwise 9000
const port = parseInt(rawPort || (useSSL && endPoint.includes('.') ? '443' : '9000'), 10);
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'apple-store';

// Folder / prefix inside bucket, e.g. 'apple-store'
// If MINIO_PREFIX is specified or MINIO_PUBLIC_URL has path after bucket name, extract it
const derivedPrefix = process.env.MINIO_PREFIX || (
  process.env.MINIO_PUBLIC_URL && process.env.MINIO_PUBLIC_URL.includes(`/${BUCKET_NAME}/`)
    ? process.env.MINIO_PUBLIC_URL.split(`/${BUCKET_NAME}/`)[1]
    : ''
);
export const BUCKET_PREFIX = (derivedPrefix || '').replace(/^\/+|\/+$/g, '');

export const PUBLIC_URL_BASE = (process.env.MINIO_PUBLIC_URL || (
  BUCKET_PREFIX
    ? `http${useSSL ? 's' : ''}://${endPoint}${port && port !== 80 && port !== 443 ? `:${port}` : ''}/${BUCKET_NAME}/${BUCKET_PREFIX}`
    : `http${useSSL ? 's' : ''}://${endPoint}${port && port !== 80 && port !== 443 ? `:${port}` : ''}/${BUCKET_NAME}`
)).replace(/\/+$/, '');

export const minioClient = new Minio.Client({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

/**
 * Format full object key with prefix inside bucket
 */
export function getFullObjectKey(objectName: string): string {
  const cleanName = objectName.replace(/^\/+/, '');
  if (!BUCKET_PREFIX) return cleanName;
  if (cleanName.startsWith(`${BUCKET_PREFIX}/`)) return cleanName;
  return `${BUCKET_PREFIX}/${cleanName}`;
}

/**
 * Ensure bucket exists and has public read policy
 */
export async function initMinioBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`[MinIO] Bucket "${BUCKET_NAME}" created successfully.`);
    }

    // Check / set public read policy for images
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`[MinIO] Bucket policy for "${BUCKET_NAME}" ensured.`);
    } catch {
      // Bucket policy might already be defined, continue
    }
  } catch (error) {
    console.error('[MinIO] Failed to initialize bucket:', error);
    throw error;
  }
}

/**
 * Upload file buffer to MinIO
 */
export async function uploadToMinio(
  fileBuffer: Buffer,
  objectName: string,
  contentType: string = 'image/jpeg',
  metadata?: Record<string, string>
): Promise<string> {
  const fullKey = getFullObjectKey(objectName);
  await minioClient.putObject(BUCKET_NAME, fullKey, fileBuffer, fileBuffer.length, {
    'Content-Type': contentType,
    ...metadata,
  });

  const relativeName = objectName.replace(/^\/+/, '');
  return `${PUBLIC_URL_BASE}/${relativeName}`;
}

/**
 * Delete an object from MinIO
 */
export async function deleteFromMinio(objectName: string): Promise<void> {
  try {
    const fullKey = getFullObjectKey(objectName);
    await minioClient.removeObject(BUCKET_NAME, fullKey);
  } catch (error) {
    console.error(`[MinIO] Error removing object ${objectName}:`, error);
  }
}
