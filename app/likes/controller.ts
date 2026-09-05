import { Request, Response } from "express";
import Users, { User } from "../users/model";
import Products, { Product } from "../products/model";
import { ApiResponse } from "../../types/response";
import { NotFoundError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";

export const getLikes = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const user: User | null = await Users.findById(req.user!._id).populate('likes');
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const response = ApiResponse.success(user.likes || [], 'Wishlist retrieved successfully');
    (response as any).likes = user.likes || [];
    res.status(200).json(response);
});

export const Likes = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { productId } = (req.validated?.body || req.body) as { productId: string };
    const user: User | null = await Users.findById(req.user!._id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const product: Product | null = await Products.findById(productId);
    if (!product) {
        throw new NotFoundError('Product not found');
    }

    user.likes = user.likes || [];
    const isLiked = user.likes.find(like => like.toString() === productId);

    if (isLiked) {
        user.likes = user.likes.filter(like => like.toString() !== productId);
        await user.save();
        const response = ApiResponse.success({ liked: false }, 'Product removed from wishlist');
        return res.status(200).json(response);
    } else {
        user.likes.push(product._id.toString());
        await user.save();
        const response = ApiResponse.success({ liked: true }, 'Product added to wishlist');
        return res.status(200).json(response);
    }
});