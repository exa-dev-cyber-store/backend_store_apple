import Categories, { Category } from '../categories/model';
import { Request, Response } from "express";
import Products, { Product } from "./model";
import path from 'path';
import fs from 'fs';
import { ApiResponse } from '../../types/response';
import { NotFoundError, BadRequestError } from '../../types/errors';
import ErrorHandler from '../../middleware/errorHandler';
import { uploadToMinio, deleteFromMinio, PUBLIC_URL_BASE } from '../../utils/minio';
import { processAndUploadImage } from '../../utils/image';

interface QueryParams {
    limit?: number;
    skip?: number;
    q?: string;
    id?: string;
    category?: string;
    sort?: string;
    sortBy?: string;
}

export const getProducts = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { limit = 0, skip = 0, q = '', category = '', id, sort, sortBy } = (req.validated?.query || req.query) as QueryParams;
    let filter: any = {};

    if (q) {
        filter = {
            ...filter,
            name: { $regex: new RegExp(q, 'i') }
        };
    }

    if (category) {
        const categoryFilter: Category | null = await Categories.findOne({ name: category });
        if (categoryFilter) {
            filter = {
                ...filter,
                category: categoryFilter._id
            };
        }
    }

    if (id) {
        filter = {
            ...filter,
            _id: { $ne: id }
        };
    }

    let sortOption: any = { createdAt: -1 };
    const activeSort = sort || sortBy;
    if (activeSort === 'price-asc') {
        sortOption = { price: 1 };
    } else if (activeSort === 'price-desc') {
        sortOption = { price: -1 };
    } else if (activeSort === 'name-asc') {
        sortOption = { name: 1 };
    } else if (activeSort === 'name-desc') {
        sortOption = { name: -1 };
    } else if (activeSort === 'oldest') {
        sortOption = { createdAt: 1 };
    } else {
        sortOption = { createdAt: -1 };
    }

    const count: number = await Products.countDocuments(filter);
    const page: number = count === 0 ? 1 : Math.ceil(count / 12);
    const products: Product[] = await Products.find(filter)
        .sort(sortOption)
        .limit(Number(limit))
        .skip(Number(skip))
        .populate('category');

    const response = ApiResponse.success({ count, page, products }, 'Products retrieved successfully');
    res.status(200).json(response);
});

export const getProduct = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const product: Product | null = await Products.findById(req.params.id).populate('category');
    if (!product) {
        throw new NotFoundError('Product not found');
    }

    const response = ApiResponse.success(product, 'Product retrieved successfully');
    res.status(200).json(response);
});

export const createProduct = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const payload = req.body as Product;
    
    // Check category by name or ObjectId
    let category: Category | null = null;
    if (payload.category) {
        category = await Categories.findOne({ name: payload.category });
        if (!category) {
            category = await Categories.findById(payload.category).catch(() => null);
        }
    }

    if (!category) {
        throw new BadRequestError('Category not found');
    } else {
        payload.category = category._id as string;
    }

    let image_thumbnail: string = '';
    let image_details: string[] = [];
    if (req.files && typeof req.files === 'object') {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files.image_thumbnail && files.image_thumbnail.length > 0) {
            const file = files.image_thumbnail[0];
            const processed = await processAndUploadImage(file);
            image_thumbnail = processed.url;
        }
        if (files.image_details && files.image_details.length > 0) {
            for (const file of files.image_details) {
                const processed = await processAndUploadImage(file);
                image_details.push(processed.url);
            }
        }
    }

    const product: Product = new Products({
        ...req.body,
        image_thumbnail,
        image_details,
    });
    await product.save();

    const response = ApiResponse.created(product, 'Product created successfully');
    res.status(201).json(response);
});

export const updateProduct = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const product: Product | null = await Products.findById(req.params.id);
    if (!product) {
        throw new NotFoundError('Product not found');
    }

    const payload = req.body as Product;
    if (payload.category) {
        let category: Category | null = await Categories.findOne({ name: payload.category });
        if (!category) {
            category = await Categories.findById(payload.category).catch(() => null);
        }
        if (!category) {
            throw new BadRequestError('Category not found');
        } else {
            payload.category = category._id as string;
        }
    }

    let image_thumbnail: string = '';
    let image_details: string[] = [];
    if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files.image_thumbnail && files.image_thumbnail.length > 0) {
            if (product.image_thumbnail) {
                const oldThumbFile = path.basename(product.image_thumbnail);
                const oldThumb = path.resolve(__dirname, '../../' + `public/images/${oldThumbFile}`);
                if (fs.existsSync(oldThumb)) {
                    fs.unlinkSync(oldThumb);
                }
                deleteFromMinio(`images/${oldThumbFile}`).catch(() => {});
                deleteFromMinio(oldThumbFile).catch(() => {});
            }
            const file = files.image_thumbnail[0];
            const processed = await processAndUploadImage(file);
            image_thumbnail = processed.url;
        }

        if (req.body.image_details) {
            if (Array.isArray(req.body.image_details) && req.body.image_details.length > 0) {
                product.image_details.forEach((image_detail) => {
                    if (!req.body.image_details.includes(image_detail)) {
                        const oldDetailFile = path.basename(image_detail);
                        const oldDetail = path.resolve(__dirname, '../../' + `public/images/${oldDetailFile}`);
                        if (fs.existsSync(oldDetail)) {
                            fs.unlinkSync(oldDetail);
                        }
                        deleteFromMinio(`images/${oldDetailFile}`).catch(() => {});
                        deleteFromMinio(oldDetailFile).catch(() => {});
                    } else {
                        image_details.push(image_detail);
                    }
                });
            } else {
                product.image_details.forEach((image_detail) => {
                    const oldDetailFile = path.basename(image_detail);
                    const oldDetail = path.resolve(__dirname, '../../' + `public/images/${oldDetailFile}`);
                    if (fs.existsSync(oldDetail)) {
                        fs.unlinkSync(oldDetail);
                    }
                    deleteFromMinio(`images/${oldDetailFile}`).catch(() => {});
                    deleteFromMinio(oldDetailFile).catch(() => {});
                });
            }
        }

        if (files.image_details && files.image_details.length > 0) {
            for (const file of files.image_details) {
                const processed = await processAndUploadImage(file);
                image_details.push(processed.url);
            }
        }
    }

    const updatedProduct: Product | null = await Products.findByIdAndUpdate(
        req.params.id,
        {
            ...payload,
            image_thumbnail: image_thumbnail.length > 0 ? image_thumbnail : product.image_thumbnail,
            image_details: image_details.length > 0 ? image_details : product.image_details,
        },
        { new: true, runValidators: true }
    );

    const response = ApiResponse.success(updatedProduct, 'Product updated successfully');
    res.status(200).json(response);
});

export const deleteProduct = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const product: Product | null = await Products.findById(req.params.id);
    if (!product) {
        throw new NotFoundError('Product not found');
    }

    if (product.image_thumbnail) {
        const thumbFile = path.basename(product.image_thumbnail);
        const image_thumbnail = path.resolve(__dirname, '../../' + `public/images/${thumbFile}`);
        if (fs.existsSync(image_thumbnail)) {
            fs.unlinkSync(image_thumbnail);
        }
        deleteFromMinio(`images/${thumbFile}`).catch(() => {});
        deleteFromMinio(thumbFile).catch(() => {});
    }
    if (product.image_details) {
        product.image_details.forEach((image_detail) => {
            const detailFile = path.basename(image_detail);
            const image = path.resolve(__dirname, '../../' + `public/images/${detailFile}`);
            if (fs.existsSync(image)) {
                fs.unlinkSync(image);
            }
            deleteFromMinio(`images/${detailFile}`).catch(() => {});
            deleteFromMinio(detailFile).catch(() => {});
        });
    }

    await Products.findByIdAndDelete(req.params.id);
    const response = ApiResponse.deleted('Product deleted successfully');
    res.status(200).json(response);
});
