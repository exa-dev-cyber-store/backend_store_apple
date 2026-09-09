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
exports.processAndUploadImage = processAndUploadImage;
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const minio_1 = require("./minio");
const getImagesDir = () => {
    const cwdDir = path_1.default.resolve(process.cwd(), 'public/images');
    if (fs_1.default.existsSync(cwdDir))
        return cwdDir;
    const rel1 = path_1.default.resolve(__dirname, '../public/images');
    if (fs_1.default.existsSync(rel1))
        return rel1;
    const rel2 = path_1.default.resolve(__dirname, '../../public/images');
    if (fs_1.default.existsSync(rel2))
        return rel2;
    fs_1.default.mkdirSync(cwdDir, { recursive: true });
    return cwdDir;
};
/**
 * Converts uploaded image to compressed WebP format and uploads to MinIO & local public/images.
 * Safe fallback: If Postman or any other client uploads PNG/JPEG/etc., it is guaranteed to become WebP.
 *
 * @param file Multer uploaded file object
 * @param options max dimensions and compression quality (0-100)
 */
function processAndUploadImage(file, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxWidth = (options === null || options === void 0 ? void 0 : options.maxWidth) || 1200;
        const maxHeight = (options === null || options === void 0 ? void 0 : options.maxHeight) || 1200;
        const quality = (options === null || options === void 0 ? void 0 : options.quality) || 85;
        const tmp_path = file.path;
        const rawBuffer = fs_1.default.readFileSync(tmp_path);
        // Convert any input format (PNG, JPG, BMP, uncompressed WebP, etc.) to compressed WebP
        const processedBuffer = yield (0, sharp_1.default)(rawBuffer)
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
        const targetPath = path_1.default.join(targetDir, filename);
        // Save to local public/images directory
        fs_1.default.writeFileSync(targetPath, processedBuffer);
        // Upload to MinIO bucket
        let url = `/${filename}`;
        try {
            yield (0, minio_1.uploadToMinio)(processedBuffer, `images/${filename}`, 'image/webp');
            yield (0, minio_1.uploadToMinio)(processedBuffer, filename, 'image/webp');
            url = `${minio_1.PUBLIC_URL_BASE}/images/${filename}`;
        }
        catch (err) {
            console.error('[MinIO] Upload error for processed WebP image:', err);
        }
        // Clean up temporary multer upload file
        try {
            if (fs_1.default.existsSync(tmp_path)) {
                fs_1.default.unlinkSync(tmp_path);
            }
        }
        catch (cleanupErr) {
            console.warn('[Cleanup] Failed to remove tmp file:', cleanupErr);
        }
        return {
            filename,
            url,
        };
    });
}
