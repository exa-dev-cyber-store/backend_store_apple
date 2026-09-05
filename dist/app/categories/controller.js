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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategory = exports.getCategories = void 0;
const model_1 = __importDefault(require("./model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
exports.getCategories = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categories = yield model_1.default.find();
    const response = response_1.ApiResponse.success(categories, 'Categories retrieved successfully');
    response.categories = categories;
    res.status(200).json(response);
}));
exports.getCategory = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const category = yield model_1.default.findById(req.params.id);
    if (!category) {
        throw new errors_1.NotFoundError('Category not found');
    }
    const response = response_1.ApiResponse.success(category, 'Category retrieved successfully');
    res.status(200).json(response);
}));
exports.createCategory = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const category = new model_1.default({ name });
    const newCategory = yield category.save();
    const response = response_1.ApiResponse.created(newCategory, 'Category created successfully');
    res.status(201).json(response);
}));
exports.updateCategory = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const category = yield model_1.default.findById(req.params.id);
    if (!category) {
        throw new errors_1.NotFoundError('Category not found');
    }
    category.name = name;
    const updatedCategory = yield category.save();
    const response = response_1.ApiResponse.success(updatedCategory, 'Category updated successfully');
    res.status(200).json(response);
}));
exports.deleteCategory = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const category = yield model_1.default.findById(req.params.id);
    if (!category) {
        throw new errors_1.NotFoundError('Category not found');
    }
    yield model_1.default.deleteOne({ _id: req.params.id });
    const response = response_1.ApiResponse.deleted('Category deleted successfully');
    res.status(200).json(response);
}));
