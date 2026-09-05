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
exports.removeProductFromCart = exports.reduceProductCart = exports.addProductToCart = exports.getCart = void 0;
const model_1 = __importDefault(require("./model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
exports.getCart = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let cart = yield model_1.default.findOne({ user: req.user._id }).populate('products.product');
    // Auto-create cart if it does not exist yet for this user
    if (!cart) {
        cart = new model_1.default({ user: req.user._id, products: [] });
        yield cart.save();
    }
    const response = response_1.ApiResponse.success(cart, 'Cart retrieved successfully');
    res.status(200).json(response);
}));
exports.addProductToCart = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, quantity = 1 } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    let cart = yield model_1.default.findOne({ user: req.user._id });
    if (!cart) {
        cart = new model_1.default({ user: req.user._id, products: [] });
    }
    const exisProduct = cart.products.find(product => product.product.toString() === productId);
    if (exisProduct) {
        exisProduct.quantity += Number(quantity);
    }
    else {
        cart.products.push({ product: productId, quantity: Number(quantity) });
    }
    yield cart.save();
    const populatedCart = yield model_1.default.findById(cart._id).populate('products.product');
    const response = response_1.ApiResponse.success(populatedCart || cart, 'Product added to cart');
    res.status(200).json(response);
}));
exports.reduceProductCart = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const cart = yield model_1.default.findOne({ user: req.user._id });
    if (!cart) {
        throw new errors_1.NotFoundError('Cart not found');
    }
    const exisProduct = cart.products.find(product => product.product.toString() === productId);
    if (!exisProduct) {
        throw new errors_1.NotFoundError('Product not in cart');
    }
    if (exisProduct.quantity <= 1) {
        const updatedCart = yield model_1.default.findOneAndUpdate({ user: req.user._id }, { $pull: { products: { product: productId } } }, { new: true }).populate('products.product');
        const response = response_1.ApiResponse.success(updatedCart, 'Product removed from cart');
        return res.status(200).json(response);
    }
    else {
        exisProduct.quantity -= 1;
        yield cart.save();
        const populatedCart = yield model_1.default.findById(cart._id).populate('products.product');
        const response = response_1.ApiResponse.success(populatedCart || cart, 'Product quantity reduced');
        return res.status(200).json(response);
    }
}));
exports.removeProductFromCart = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const cart = yield model_1.default.findOneAndUpdate({ user: req.user._id }, { $pull: { products: { product: productId } } }, { new: true }).populate('products.product');
    if (!cart) {
        throw new errors_1.NotFoundError('Cart not found');
    }
    const response = response_1.ApiResponse.success(cart, 'Product removed from cart');
    res.status(200).json(response);
}));
