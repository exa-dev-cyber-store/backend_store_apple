"use strict";
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const minio_1 = require("../utils/minio");
const model_1 = __importDefault(require("../app/products/model"));
dotenv_1.default.config();
function getMimeType(fileName) {
    const ext = path_1.default.extname(fileName).toLowerCase();
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
function cleanImageFilename(rawPath) {
    if (!rawPath)
        return '';
    const cleaned = rawPath.trim().split('?')[0];
    const parts = cleaned.split(/[/\\]/);
    return parts[parts.length - 1];
}
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('=== Step 1: Initializing MinIO Bucket & Policy ===');
        yield (0, minio_1.initMinioBucket)();
        console.log('\n=== Step 2: Uploading Local Images to MinIO ===');
        const imagesDir = path_1.default.join(__dirname, '../public/images');
        if (!fs_1.default.existsSync(imagesDir)) {
            console.error(`Images directory not found at: ${imagesDir}`);
            process.exit(1);
        }
        const files = fs_1.default.readdirSync(imagesDir);
        console.log(`Found ${files.length} files in ${imagesDir}`);
        let uploadSuccessCount = 0;
        let uploadFailCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path_1.default.join(imagesDir, file);
            const stat = fs_1.default.statSync(filePath);
            if (stat.isFile()) {
                try {
                    const buffer = fs_1.default.readFileSync(filePath);
                    const mimeType = getMimeType(file);
                    // Upload both to images/file and file for universal path matching
                    yield (0, minio_1.uploadToMinio)(buffer, `images/${file}`, mimeType);
                    yield (0, minio_1.uploadToMinio)(buffer, file, mimeType);
                    uploadSuccessCount++;
                    if ((i + 1) % 25 === 0 || i + 1 === files.length) {
                        console.log(`Uploaded ${i + 1}/${files.length} images to MinIO...`);
                    }
                }
                catch (err) {
                    console.error(`Failed to upload ${file}:`, err);
                    uploadFailCount++;
                }
            }
        }
        console.log(`Upload summary: ${uploadSuccessCount} succeeded, ${uploadFailCount} failed.`);
        console.log('\n=== Step 3: Updating MongoDB Product Image URLs ===');
        const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
        yield mongoose_1.default.connect(dbUri);
        console.log('Connected to MongoDB.');
        const products = yield model_1.default.find({});
        console.log(`Found ${products.length} products to check and migrate.`);
        let updatedProductsCount = 0;
        for (const product of products) {
            let modified = false;
            // Handle image_thumbnail
            if (product.image_thumbnail && !product.image_thumbnail.startsWith(minio_1.PUBLIC_URL_BASE)) {
                const filename = cleanImageFilename(product.image_thumbnail);
                if (filename) {
                    product.image_thumbnail = `${minio_1.PUBLIC_URL_BASE}/images/${filename}`;
                    modified = true;
                }
            }
            // Handle image_details array
            if (Array.isArray(product.image_details)) {
                const updatedDetails = product.image_details.map((detail) => {
                    if (detail && !detail.startsWith(minio_1.PUBLIC_URL_BASE)) {
                        const filename = cleanImageFilename(detail);
                        if (filename) {
                            modified = true;
                            return `${minio_1.PUBLIC_URL_BASE}/images/${filename}`;
                        }
                    }
                    return detail;
                });
                product.image_details = updatedDetails;
            }
            if (modified) {
                yield product.save();
                updatedProductsCount++;
            }
        }
        console.log(`Product migration complete: ${updatedProductsCount} products updated with MinIO URLs.`);
        console.log('\n=== Migration to MinIO Finished Successfully ===');
        yield mongoose_1.default.disconnect();
        process.exit(0);
    });
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
