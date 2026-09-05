import Carts, { Cart } from "./model";
import { Request, Response } from "express";
import { ApiResponse } from "../../types/response";
import { NotFoundError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";

interface ReqUser {
    productId: string;
    quantity: number;
}

export const getCart = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    let cart: Cart | null = await Carts.findOne({ user: req.user!._id }).populate('products.product');
    
    // Auto-create cart if it does not exist yet for this user
    if (!cart) {
        cart = new Carts({ user: req.user!._id, products: [] });
        await cart.save();
    }

    const response = ApiResponse.success(cart, 'Cart retrieved successfully');
    res.status(200).json(response);
});

export const addProductToCart = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { productId, quantity = 1 } = (req.validated?.body || req.body) as ReqUser;
    let cart: Cart | null = await Carts.findOne({ user: req.user!._id });

    if (!cart) {
        cart = new Carts({ user: req.user!._id, products: [] });
    }

    const exisProduct = cart.products.find(product => product.product.toString() === productId);
    if (exisProduct) {
        exisProduct.quantity += Number(quantity);
    } else {
        cart.products.push({ product: productId as any, quantity: Number(quantity) });
    }

    await cart.save();
    const populatedCart = await Carts.findById(cart._id).populate('products.product');

    const response = ApiResponse.success(populatedCart || cart, 'Product added to cart');
    res.status(200).json(response);
});

export const reduceProductCart = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { productId } = (req.validated?.body || req.body) as ReqUser;
    const cart: Cart | null = await Carts.findOne({ user: req.user!._id });

    if (!cart) {
        throw new NotFoundError('Cart not found');
    }

    const exisProduct = cart.products.find(product => product.product.toString() === productId);
    if (!exisProduct) {
        throw new NotFoundError('Product not in cart');
    }

    if (exisProduct.quantity <= 1) {
        const updatedCart = await Carts.findOneAndUpdate(
            { user: req.user!._id },
            { $pull: { products: { product: productId } } },
            { new: true }
        ).populate('products.product');
        const response = ApiResponse.success(updatedCart, 'Product removed from cart');
        return res.status(200).json(response);
    } else {
        exisProduct.quantity -= 1;
        await cart.save();
        const populatedCart = await Carts.findById(cart._id).populate('products.product');
        const response = ApiResponse.success(populatedCart || cart, 'Product quantity reduced');
        return res.status(200).json(response);
    }
});

export const removeProductFromCart = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { productId } = (req.validated?.body || req.body) as ReqUser;
    const cart: Cart | null = await Carts.findOneAndUpdate(
        { user: req.user!._id },
        { $pull: { products: { product: productId } } },
        { new: true }
    ).populate('products.product');

    if (!cart) {
        throw new NotFoundError('Cart not found');
    }

    const response = ApiResponse.success(cart, 'Product removed from cart');
    res.status(200).json(response);
});
