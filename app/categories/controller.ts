import Categories, { Category } from './model';
import type { Request, Response } from 'express';
import { ApiResponse } from '../../types/response';
import { NotFoundError } from '../../types/errors';
import ErrorHandler from '../../middleware/errorHandler';

export const getCategories = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const categories: Category[] = await Categories.find();
    const response = ApiResponse.success(categories, 'Categories retrieved successfully');
    (response as any).categories = categories;
    res.status(200).json(response);
});

export const getCategory = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const category: Category | null = await Categories.findById(req.params.id);
    if (!category) {
        throw new NotFoundError('Category not found');
    }

    const response = ApiResponse.success(category, 'Category retrieved successfully');
    res.status(200).json(response);
});

export const createCategory = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { name } = (req.validated?.body || req.body) as { name: string };
    const category: Category = new Categories({ name });
    const newCategory: Category = await category.save();

    const response = ApiResponse.created(newCategory, 'Category created successfully');
    res.status(201).json(response);
});

export const updateCategory = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { name } = (req.validated?.body || req.body) as { name: string };
    const category: Category | null = await Categories.findById(req.params.id);
    if (!category) {
        throw new NotFoundError('Category not found');
    }

    category.name = name;
    const updatedCategory = await category.save();

    const response = ApiResponse.success(updatedCategory, 'Category updated successfully');
    res.status(200).json(response);
});

export const deleteCategory = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const category: Category | null = await Categories.findById(req.params.id);
    if (!category) {
        throw new NotFoundError('Category not found');
    }

    await Categories.deleteOne({ _id: req.params.id });
    const response = ApiResponse.deleted('Category deleted successfully');
    res.status(200).json(response);
});