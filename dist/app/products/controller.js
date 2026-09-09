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
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const model_1 = __importDefault(require("../categories/model"));
const model_2 = __importDefault(require("./model"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
const minio_1 = require("../../utils/minio");
const image_1 = require("../../utils/image");
exports.getProducts = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { limit = 0, skip = 0, q = '', category = '', id, sort, sortBy } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.query) || req.query);
    let filter = {};
    if (q) {
        filter = Object.assign(Object.assign({}, filter), { name: { $regex: new RegExp(q, 'i') } });
    }
    if (category) {
        const categoryFilter = yield model_1.default.findOne({ name: category });
        if (categoryFilter) {
            filter = Object.assign(Object.assign({}, filter), { category: categoryFilter._id });
        }
    }
    if (id) {
        filter = Object.assign(Object.assign({}, filter), { _id: { $ne: id } });
    }
    let sortOption = { createdAt: -1 };
    const activeSort = sort || sortBy;
    if (activeSort === 'price-asc') {
        sortOption = { price: 1 };
    }
    else if (activeSort === 'price-desc') {
        sortOption = { price: -1 };
    }
    else if (activeSort === 'name-asc') {
        sortOption = { name: 1 };
    }
    else if (activeSort === 'name-desc') {
        sortOption = { name: -1 };
    }
    else if (activeSort === 'oldest') {
        sortOption = { createdAt: 1 };
    }
    else {
        sortOption = { createdAt: -1 };
    }
    const count = yield model_2.default.countDocuments(filter);
    const page = count === 0 ? 1 : Math.ceil(count / 12);
    const products = yield model_2.default.find(filter)
        .sort(sortOption)
        .limit(Number(limit))
        .skip(Number(skip))
        .populate('category');
    const response = response_1.ApiResponse.success({ count, page, products }, 'Products retrieved successfully');
    res.status(200).json(response);
}));
exports.getProduct = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield model_2.default.findById(req.params.id).populate('category');
    if (!product) {
        throw new errors_1.NotFoundError('Product not found');
    }
    const response = response_1.ApiResponse.success(product, 'Product retrieved successfully');
    res.status(200).json(response);
}));
exports.createProduct = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body;
    // Check category by name or ObjectId
    let category = null;
    if (payload.category) {
        category = yield model_1.default.findOne({ name: payload.category });
        if (!category) {
            category = yield model_1.default.findById(payload.category).catch(() => null);
        }
    }
    if (!category) {
        throw new errors_1.BadRequestError('Category not found');
    }
    else {
        payload.category = category._id;
    }
    let image_thumbnail = '';
    let image_details = [];
    if (req.files && typeof req.files === 'object') {
        const files = req.files;
        if (files.image_thumbnail && files.image_thumbnail.length > 0) {
            const file = files.image_thumbnail[0];
            const processed = yield (0, image_1.processAndUploadImage)(file);
            image_thumbnail = processed.url;
        }
        if (files.image_details && files.image_details.length > 0) {
            for (const file of files.image_details) {
                const processed = yield (0, image_1.processAndUploadImage)(file);
                image_details.push(processed.url);
            }
        }
    }
    const product = new model_2.default(Object.assign(Object.assign({}, req.body), { image_thumbnail,
        image_details }));
    yield product.save();
    const response = response_1.ApiResponse.created(product, 'Product created successfully');
    res.status(201).json(response);
}));
exports.updateProduct = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield model_2.default.findById(req.params.id);
    if (!product) {
        throw new errors_1.NotFoundError('Product not found');
    }
    const payload = req.body;
    if (payload.category) {
        let category = yield model_1.default.findOne({ name: payload.category });
        if (!category) {
            category = yield model_1.default.findById(payload.category).catch(() => null);
        }
        if (!category) {
            throw new errors_1.BadRequestError('Category not found');
        }
        else {
            payload.category = category._id;
        }
    }
    let image_thumbnail = '';
    let image_details = [];
    if (req.files) {
        const files = req.files;
        if (files.image_thumbnail && files.image_thumbnail.length > 0) {
            if (product.image_thumbnail) {
                const oldThumbFile = path_1.default.basename(product.image_thumbnail);
                const oldThumb = path_1.default.resolve(__dirname, '../../' + `public/images/${oldThumbFile}`);
                if (fs_1.default.existsSync(oldThumb)) {
                    fs_1.default.unlinkSync(oldThumb);
                }
                (0, minio_1.deleteFromMinio)(`images/${oldThumbFile}`).catch(() => { });
                (0, minio_1.deleteFromMinio)(oldThumbFile).catch(() => { });
            }
            const file = files.image_thumbnail[0];
            const processed = yield (0, image_1.processAndUploadImage)(file);
            image_thumbnail = processed.url;
        }
        if (req.body.image_details) {
            if (Array.isArray(req.body.image_details) && req.body.image_details.length > 0) {
                product.image_details.forEach((image_detail) => {
                    if (!req.body.image_details.includes(image_detail)) {
                        const oldDetailFile = path_1.default.basename(image_detail);
                        const oldDetail = path_1.default.resolve(__dirname, '../../' + `public/images/${oldDetailFile}`);
                        if (fs_1.default.existsSync(oldDetail)) {
                            fs_1.default.unlinkSync(oldDetail);
                        }
                        (0, minio_1.deleteFromMinio)(`images/${oldDetailFile}`).catch(() => { });
                        (0, minio_1.deleteFromMinio)(oldDetailFile).catch(() => { });
                    }
                    else {
                        image_details.push(image_detail);
                    }
                });
            }
            else {
                product.image_details.forEach((image_detail) => {
                    const oldDetailFile = path_1.default.basename(image_detail);
                    const oldDetail = path_1.default.resolve(__dirname, '../../' + `public/images/${oldDetailFile}`);
                    if (fs_1.default.existsSync(oldDetail)) {
                        fs_1.default.unlinkSync(oldDetail);
                    }
                    (0, minio_1.deleteFromMinio)(`images/${oldDetailFile}`).catch(() => { });
                    (0, minio_1.deleteFromMinio)(oldDetailFile).catch(() => { });
                });
            }
        }
        if (files.image_details && files.image_details.length > 0) {
            for (const file of files.image_details) {
                const processed = yield (0, image_1.processAndUploadImage)(file);
                image_details.push(processed.url);
            }
        }
    }
    const updatedProduct = yield model_2.default.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, payload), { image_thumbnail: image_thumbnail.length > 0 ? image_thumbnail : product.image_thumbnail, image_details: image_details.length > 0 ? image_details : product.image_details }), { new: true, runValidators: true });
    const response = response_1.ApiResponse.success(updatedProduct, 'Product updated successfully');
    res.status(200).json(response);
}));
exports.deleteProduct = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield model_2.default.findById(req.params.id);
    if (!product) {
        throw new errors_1.NotFoundError('Product not found');
    }
    if (product.image_thumbnail) {
        const thumbFile = path_1.default.basename(product.image_thumbnail);
        const image_thumbnail = path_1.default.resolve(__dirname, '../../' + `public/images/${thumbFile}`);
        if (fs_1.default.existsSync(image_thumbnail)) {
            fs_1.default.unlinkSync(image_thumbnail);
        }
        (0, minio_1.deleteFromMinio)(`images/${thumbFile}`).catch(() => { });
        (0, minio_1.deleteFromMinio)(thumbFile).catch(() => { });
    }
    if (product.image_details) {
        product.image_details.forEach((image_detail) => {
            const detailFile = path_1.default.basename(image_detail);
            const image = path_1.default.resolve(__dirname, '../../' + `public/images/${detailFile}`);
            if (fs_1.default.existsSync(image)) {
                fs_1.default.unlinkSync(image);
            }
            (0, minio_1.deleteFromMinio)(`images/${detailFile}`).catch(() => { });
            (0, minio_1.deleteFromMinio)(detailFile).catch(() => { });
        });
    }
    yield model_2.default.findByIdAndDelete(req.params.id);
    const response = response_1.ApiResponse.deleted('Product deleted successfully');
    res.status(200).json(response);
}));
