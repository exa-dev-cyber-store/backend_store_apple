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
exports.Likes = exports.getLikes = void 0;
const model_1 = __importDefault(require("../users/model"));
const model_2 = __importDefault(require("../products/model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
exports.getLikes = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield model_1.default.findById(req.user._id).populate('likes');
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    const response = response_1.ApiResponse.success(user.likes || [], 'Wishlist retrieved successfully');
    response.likes = user.likes || [];
    res.status(200).json(response);
}));
exports.Likes = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const user = yield model_1.default.findById(req.user._id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    const product = yield model_2.default.findById(productId);
    if (!product) {
        throw new errors_1.NotFoundError('Product not found');
    }
    user.likes = user.likes || [];
    const isLiked = user.likes.find(like => like.toString() === productId);
    if (isLiked) {
        user.likes = user.likes.filter(like => like.toString() !== productId);
        yield user.save();
        const response = response_1.ApiResponse.success({ liked: false }, 'Product removed from wishlist');
        return res.status(200).json(response);
    }
    else {
        user.likes.push(product._id.toString());
        yield user.save();
        const response = response_1.ApiResponse.success({ liked: true }, 'Product added to wishlist');
        return res.status(200).json(response);
    }
}));
