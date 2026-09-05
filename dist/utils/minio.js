"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minioClient = exports.PUBLIC_URL_BASE = exports.BUCKET_PREFIX = exports.BUCKET_NAME = void 0;
exports.getFullObjectKey = getFullObjectKey;
exports.initMinioBucket = initMinioBucket;
exports.uploadToMinio = uploadToMinio;
exports.deleteFromMinio = deleteFromMinio;
const Minio = __importStar(require("minio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
const rawPort = process.env.MINIO_PORT;
const useSSL = process.env.MINIO_USE_SSL === 'true';
// Default to 443 if SSL and domain endpoint, otherwise 9000
const port = parseInt(rawPort || (useSSL && endPoint.includes('.') ? '443' : '9000'), 10);
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
exports.BUCKET_NAME = process.env.MINIO_BUCKET || 'apple-store';
// Folder / prefix inside bucket, e.g. 'apple-store'
// If MINIO_PREFIX is specified or MINIO_PUBLIC_URL has path after bucket name, extract it
const derivedPrefix = process.env.MINIO_PREFIX || (process.env.MINIO_PUBLIC_URL && process.env.MINIO_PUBLIC_URL.includes(`/${exports.BUCKET_NAME}/`)
    ? process.env.MINIO_PUBLIC_URL.split(`/${exports.BUCKET_NAME}/`)[1]
    : '');
exports.BUCKET_PREFIX = (derivedPrefix || '').replace(/^\/+|\/+$/g, '');
exports.PUBLIC_URL_BASE = (process.env.MINIO_PUBLIC_URL || (exports.BUCKET_PREFIX
    ? `http${useSSL ? 's' : ''}://${endPoint}${port && port !== 80 && port !== 443 ? `:${port}` : ''}/${exports.BUCKET_NAME}/${exports.BUCKET_PREFIX}`
    : `http${useSSL ? 's' : ''}://${endPoint}${port && port !== 80 && port !== 443 ? `:${port}` : ''}/${exports.BUCKET_NAME}`)).replace(/\/+$/, '');
exports.minioClient = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
});
/**
 * Format full object key with prefix inside bucket
 */
function getFullObjectKey(objectName) {
    const cleanName = objectName.replace(/^\/+/, '');
    if (!exports.BUCKET_PREFIX)
        return cleanName;
    if (cleanName.startsWith(`${exports.BUCKET_PREFIX}/`))
        return cleanName;
    return `${exports.BUCKET_PREFIX}/${cleanName}`;
}
/**
 * Ensure bucket exists and has public read policy
 */
function initMinioBucket() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const exists = yield exports.minioClient.bucketExists(exports.BUCKET_NAME);
            if (!exists) {
                yield exports.minioClient.makeBucket(exports.BUCKET_NAME, 'us-east-1');
                console.log(`[MinIO] Bucket "${exports.BUCKET_NAME}" created successfully.`);
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
                            Resource: [`arn:aws:s3:::${exports.BUCKET_NAME}/*`],
                        },
                    ],
                };
                yield exports.minioClient.setBucketPolicy(exports.BUCKET_NAME, JSON.stringify(policy));
                console.log(`[MinIO] Bucket policy for "${exports.BUCKET_NAME}" ensured.`);
            }
            catch (_a) {
                // Bucket policy might already be defined, continue
            }
        }
        catch (error) {
            console.error('[MinIO] Failed to initialize bucket:', error);
            throw error;
        }
    });
}
/**
 * Upload file buffer to MinIO
 */
function uploadToMinio(fileBuffer_1, objectName_1) {
    return __awaiter(this, arguments, void 0, function* (fileBuffer, objectName, contentType = 'image/jpeg', metadata) {
        const fullKey = getFullObjectKey(objectName);
        yield exports.minioClient.putObject(exports.BUCKET_NAME, fullKey, fileBuffer, fileBuffer.length, Object.assign({ 'Content-Type': contentType }, metadata));
        const relativeName = objectName.replace(/^\/+/, '');
        return `${exports.PUBLIC_URL_BASE}/${relativeName}`;
    });
}
/**
 * Delete an object from MinIO
 */
function deleteFromMinio(objectName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fullKey = getFullObjectKey(objectName);
            yield exports.minioClient.removeObject(exports.BUCKET_NAME, fullKey);
        }
        catch (error) {
            console.error(`[MinIO] Error removing object ${objectName}:`, error);
        }
    });
}
