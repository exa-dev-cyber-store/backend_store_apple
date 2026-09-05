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
exports.deleteDeliveryAddress = exports.updateDeliveryAddress = exports.createDeliveryAddress = exports.getDeliveryAddress = exports.getDeliveryAddresses = void 0;
const model_1 = __importDefault(require("./model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
exports.getDeliveryAddresses = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deliveryAddresses = yield model_1.default.find({ user: req.user._id });
    const response = response_1.ApiResponse.success(deliveryAddresses, 'Delivery addresses retrieved successfully');
    response.deliveryAddresses = deliveryAddresses;
    res.status(200).json(response);
}));
exports.getDeliveryAddress = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deliveryAddress = yield model_1.default.findOne({
        _id: req.params.id,
        user: req.user._id,
    });
    if (!deliveryAddress) {
        throw new errors_1.NotFoundError('Delivery address not found');
    }
    const response = response_1.ApiResponse.success(deliveryAddress, 'Delivery address retrieved successfully');
    res.status(200).json(response);
}));
exports.createDeliveryAddress = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const payload = Object.assign(Object.assign({}, (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body)), { user: req.user._id });
    const deliveryAddress = yield model_1.default.create(payload);
    const response = response_1.ApiResponse.created(deliveryAddress, 'Delivery address created successfully');
    res.status(201).json(response);
}));
exports.updateDeliveryAddress = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const deliveryAddress = yield model_1.default.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body) }, { new: true, runValidators: true });
    if (!deliveryAddress) {
        throw new errors_1.NotFoundError('Delivery address not found');
    }
    const response = response_1.ApiResponse.success(deliveryAddress, 'Delivery address updated successfully');
    res.status(200).json(response);
}));
exports.deleteDeliveryAddress = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deliveryAddress = yield model_1.default.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
    });
    if (!deliveryAddress) {
        throw new errors_1.NotFoundError('Delivery address not found');
    }
    const response = response_1.ApiResponse.deleted('Delivery address deleted successfully');
    res.status(200).json(response);
}));
