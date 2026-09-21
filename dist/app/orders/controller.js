"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.autoGenerateOrder = exports.getPaymentStatus = exports.chargeCoreApi = exports.handleMidtransNotification = exports.getOrder = exports.getAllOrders = exports.updateOrder = exports.getOrders = exports.createOrder = exports.applyMidtransNotificationOverride = exports.triggerPaymentSuccessReceipt = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const midtrans_client_1 = __importDefault(require("midtrans-client"));
const model_1 = __importDefault(require("./model"));
const model_2 = __importDefault(require("../deliveryAddress/model"));
const model_3 = __importDefault(require("../cart/model"));
const model_4 = __importDefault(require("../invoices/model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
const service_1 = require("../notifications/service");
const emailService_1 = require("../services/emailService");
const triggerPaymentSuccessReceipt = (order, invoice) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (order.receipt_sent)
            return;
        order.receipt_sent = true;
        yield order.save();
        const populatedOrder = yield model_1.default.findById(order._id).populate('user').populate('order_items._id');
        const userDoc = populatedOrder === null || populatedOrder === void 0 ? void 0 : populatedOrder.user;
        if (userDoc && userDoc.email) {
            let inv = invoice;
            if (!inv) {
                try {
                    inv = yield model_4.default.findOne({ order: order._id });
                }
                catch (_a) {
                    inv = null;
                }
            }
            emailService_1.EmailService.sendPaymentReceiptEmail({
                order: populatedOrder,
                user: userDoc,
                invoice: inv,
            }).catch((err) => console.error('[Receipt Email Error]:', err));
        }
    }
    catch (error) {
        console.error('[Receipt Dispatch Error]:', error);
    }
});
exports.triggerPaymentSuccessReceipt = triggerPaymentSuccessReceipt;
const applyMidtransNotificationOverride = (client, customOverrideUrl) => {
    var _a, _b;
    let overrideUrl = (customOverrideUrl || process.env.MIDTRANS_OVERRIDE_NOTIFICATION_URL || process.env.MIDTRANS_NOTIFICATION_URL || '').trim();
    const appendUrl = (process.env.MIDTRANS_APPEND_NOTIFICATION_URL || '').trim();
    if (overrideUrl) {
        try {
            const parsed = new URL(overrideUrl);
            if (!parsed.hostname) {
                overrideUrl = '';
            }
        }
        catch (_c) {
            overrideUrl = '';
        }
    }
    if (overrideUrl && ((_a = client === null || client === void 0 ? void 0 : client.httpClient) === null || _a === void 0 ? void 0 : _a.http_client)) {
        client.httpClient.http_client.defaults.headers.common = client.httpClient.http_client.defaults.headers.common || {};
        client.httpClient.http_client.defaults.headers.common['X-Override-Notification'] = overrideUrl;
        client.httpClient.http_client.interceptors.request.use((config) => {
            config.headers = config.headers || {};
            config.headers['X-Override-Notification'] = overrideUrl;
            return config;
        });
    }
    if (appendUrl && ((_b = client === null || client === void 0 ? void 0 : client.httpClient) === null || _b === void 0 ? void 0 : _b.http_client)) {
        client.httpClient.http_client.defaults.headers.common = client.httpClient.http_client.defaults.headers.common || {};
        client.httpClient.http_client.defaults.headers.common['X-Append-Notification'] = appendUrl;
        client.httpClient.http_client.interceptors.request.use((config) => {
            config.headers = config.headers || {};
            config.headers['X-Append-Notification'] = appendUrl;
            return config;
        });
    }
};
exports.applyMidtransNotificationOverride = applyMidtransNotificationOverride;
exports.createOrder = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const snap = new midtrans_client_1.default.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    (0, exports.applyMidtransNotificationOverride)(snap, ((_a = req.body) === null || _a === void 0 ? void 0 : _a.override_notification_url) || req.headers['x-override-notification']);
    const payload = Object.assign(Object.assign({}, req.body), { user: req.user._id });
    const cart = yield model_3.default.findOne({ user: req.user._id }).populate('products.product');
    const deliveryAddress = yield model_2.default.findById(payload.deliveryAddress);
    if (!deliveryAddress) {
        throw new errors_1.BadRequestError('Delivery address not found');
    }
    if (!cart || !cart.products || cart.products.length === 0) {
        throw new errors_1.BadRequestError('Cart is empty');
    }
    const validItems = cart.products.filter((item) => item && item.product && item.product._id);
    if (validItems.length === 0) {
        throw new errors_1.BadRequestError('Cart does not contain valid products');
    }
    const orderItems = validItems.map((item) => ({
        _id: item.product._id,
        quantity: item.quantity || 1,
        price: item.product.price,
        name: item.product.name
    }));
    // Server-side authoritative calculation
    const calculatedSubTotal = orderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const calculatedTax = Math.round(calculatedSubTotal * 0.05);
    const calculatedShipping = calculatedSubTotal > 5000000 ? 0 : 25000;
    const calculatedDiscount = Math.min(calculatedSubTotal, Math.max(0, Number(payload.discount) || 0));
    const calculatedTotal = Math.max(0, calculatedSubTotal + calculatedTax + calculatedShipping - calculatedDiscount);
    const order = new model_1.default({
        user: req.user._id,
        order_items: orderItems,
        tax: calculatedTax,
        shipping: calculatedShipping,
        discount: calculatedDiscount,
        total: calculatedTotal,
        payment_method: 'snap',
        status_payment: 'pending',
        status_delivery: 'pending',
        delivery_address: {
            provinsi: deliveryAddress.provinsi,
            kabupaten: deliveryAddress.kabupaten,
            name: deliveryAddress.name,
            kecamatan: deliveryAddress.kecamatan,
            kelurahan: deliveryAddress.kelurahan,
            detail: deliveryAddress.detail
        }
    });
    const itemsList = [
        ...orderItems.map((item) => ({
            id: item._id.toString().substring(0, 50),
            price: item.price,
            quantity: item.quantity,
            name: item.name.substring(0, 50),
        })),
        ...(calculatedShipping > 0 ? [{ id: 'shipping_cost', price: calculatedShipping, quantity: 1, name: 'Shipping Cost' }] : []),
        ...(calculatedTax > 0 ? [{ id: 'tax', price: calculatedTax, quantity: 1, name: 'Tax' }] : []),
        ...(calculatedDiscount > 0 ? [{ id: 'discount', price: -calculatedDiscount, quantity: 1, name: 'Discount' }] : []),
    ];
    const parameter = {
        transaction_details: {
            order_id: String(order._id),
            gross_amount: calculatedTotal,
        },
        credit_card: {
            secure: true
        },
        customer_details: {
            first_name: req.user.name,
            last_name: '',
            name: req.user.name,
            email: req.user.email,
        },
        item_details: itemsList,
    };
    const transaction = yield snap.createTransaction(parameter);
    yield model_3.default.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } });
    order.token = transaction.token;
    order.url_redirect = transaction.redirect_url;
    yield order.save();
    const response = response_1.ApiResponse.success({
        url: transaction.redirect_url,
        token: transaction.token,
    }, 'Order created successfully');
    res.status(200).json(response);
}));
exports.getOrders = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { skip, limit, page, status } = req.query;
    const filter = { user: req.user._id };
    if (status && typeof status === 'string' && status !== 'all') {
        const statusLower = status.toLowerCase();
        if (statusLower === 'completed' || statusLower === 'paid') {
            filter.status_payment = { $in: ['completed', 'paid', 'settlement'] };
        }
        else if (statusLower === 'pending') {
            filter.status_payment = { $in: ['pending', 'waiting'] };
        }
        else if (statusLower === 'cancelled' || statusLower === 'expired') {
            filter.status_payment = { $in: ['cancelled', 'cancel', 'expire', 'expired', 'deny', 'failure'] };
        }
        else {
            filter.status_payment = status;
        }
    }
    const count = yield model_1.default.countDocuments(filter);
    let query = model_1.default.find(filter)
        .populate('order_items._id')
        .sort({ createdAt: -1 });
    const isPaginated = page !== undefined || limit !== undefined || skip !== undefined;
    const parsedLimit = isPaginated ? Math.max(1, parseInt(limit) || 5) : 0;
    const parsedPage = isPaginated ? Math.max(1, parseInt(page) || 1) : 1;
    const parsedSkip = skip !== undefined ? Math.max(0, parseInt(skip) || 0) : (parsedPage - 1) * parsedLimit;
    if (isPaginated && parsedLimit > 0) {
        query = query.skip(parsedSkip).limit(parsedLimit);
    }
    const orders = yield query;
    const totalPages = isPaginated && parsedLimit > 0 ? Math.max(1, Math.ceil(count / parsedLimit)) : 1;
    const response = response_1.ApiResponse.success(orders, 'User orders retrieved successfully');
    response.orders = orders;
    response.count = count;
    response.total = count;
    response.totalPages = totalPages;
    response.currentPage = parsedPage;
    response.limit = parsedLimit > 0 ? parsedLimit : count;
    res.status(200).json(response);
}));
exports.updateOrder = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const status_delivery = req.body.status_delivery;
    const existingOrder = yield model_1.default.findById(req.params.id);
    if (!existingOrder) {
        throw new errors_1.NotFoundError('Order not found');
    }
    const previousStatus = existingOrder.status_delivery;
    existingOrder.status_delivery = status_delivery;
    yield existingOrder.save();
    // Trigger push notification if status has changed and order has a customer user
    if (status_delivery && status_delivery !== previousStatus && existingOrder.user) {
        const userId = ((_a = existingOrder.user) === null || _a === void 0 ? void 0 : _a._id)
            ? String(existingOrder.user._id)
            : String(existingOrder.user);
        service_1.NotificationService.sendOrderDeliveryNotification({
            orderId: String(existingOrder._id),
            userId,
            deliveryStatus: status_delivery,
        }).catch((err) => console.error('Failed to dispatch delivery push notification:', err));
    }
    const response = response_1.ApiResponse.success({ order: existingOrder, message: 'Order updated' }, 'Order updated successfully');
    res.status(200).json(response);
}));
exports.getAllOrders = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { skip, limit } = req.query;
    const parsedSkip = parseInt(skip) || 0;
    const parsedLimit = parseInt(limit) || 12;
    const orders = yield model_1.default.find({ payment_method: { $ne: '', $exists: true } })
        .populate('user', 'name email avatar')
        .populate('order_items._id')
        .sort({ createdAt: -1 })
        .skip(parsedSkip)
        .limit(parsedLimit);
    const count = yield model_1.default.countDocuments({ payment_method: { $ne: '', $exists: true } });
    const page = count === 0 ? 1 : Math.ceil(count / 12);
    const response = response_1.ApiResponse.success({ orders, count, page }, 'Orders retrieved successfully');
    res.status(200).json(response);
}));
exports.getOrder = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const order = yield model_1.default.findById(req.params.id)
        .populate('user', 'name email avatar')
        .populate('order_items._id');
    if (!order) {
        throw new errors_1.NotFoundError('Order not found');
    }
    const response = response_1.ApiResponse.success(order, 'Order retrieved successfully');
    res.status(200).json(response);
}));
const handleMidtransNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const snap = new midtrans_client_1.default.Snap({
            isProduction: false,
            serverKey: process.env.MIDTRANS_SERVER_KEY,
        });
        const notification = req.body;
        let statusResponse = notification;
        try {
            statusResponse = yield snap.transaction.notification(notification);
        }
        catch (_d) {
            statusResponse = notification;
        }
        const rawOrderId = String(statusResponse.order_id || '');
        const cleanOrderId = rawOrderId.split('-')[0];
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;
        const isCleanIdValid = mongoose_1.default.Types.ObjectId.isValid(cleanOrderId);
        const order = (isCleanIdValid ? yield model_1.default.findById(cleanOrderId) : null) ||
            (yield model_1.default.findOne({ token: statusResponse.transaction_id })) ||
            (yield model_1.default.findOne({ token: rawOrderId }));
        if (!order) {
            return res.status(200).send('OK');
        }
        const resolvedOrderId = order._id;
        const invoice = yield model_4.default.findOne({ order: resolvedOrderId });
        const existingDetails = order.payment_details || {};
        const mergedDetails = Object.assign(Object.assign(Object.assign({}, existingDetails), statusResponse), { actions: (statusResponse.actions && statusResponse.actions.length > 0) ? statusResponse.actions : existingDetails.actions, qr_string: statusResponse.qr_string || existingDetails.qr_string, va_numbers: (statusResponse.va_numbers && statusResponse.va_numbers.length > 0) ? statusResponse.va_numbers : existingDetails.va_numbers, permata_va_number: statusResponse.permata_va_number || existingDetails.permata_va_number, bill_key: statusResponse.bill_key || existingDetails.bill_key, biller_code: statusResponse.biller_code || existingDetails.biller_code, payment_code: statusResponse.payment_code || existingDetails.payment_code });
        order.payment_method = statusResponse.payment_type || order.payment_method;
        order.payment_details = mergedDetails;
        if (transactionStatus === 'capture') {
            if (fraudStatus === 'accept') {
                order.status_payment = 'completed';
                if (invoice) {
                    invoice.payment_method = statusResponse.payment_type;
                    invoice.status_payment = 'completed';
                    invoice.payment_details = mergedDetails;
                    yield invoice.save();
                }
                yield (0, exports.triggerPaymentSuccessReceipt)(order, invoice);
                if (order.user) {
                    const userId = ((_a = order.user) === null || _a === void 0 ? void 0 : _a._id) ? String(order.user._id) : String(order.user);
                    service_1.NotificationService.createAndDispatch({
                        userId,
                        title: 'Pembayaran Diterima! 💳',
                        body: `Pembayaran untuk pesanan #${String(order._id).slice(-6).toUpperCase()} berhasil dikonfirmasi. Tim kami sedang menyiapkan pesanan Anda.`,
                        type: 'delivery',
                        data: { orderId: String(order._id), link: '/account/order' },
                    }).catch((err) => console.error('[Webhook Notification Error]:', err));
                }
            }
        }
        else if (transactionStatus === 'settlement') {
            order.status_payment = 'completed';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'completed';
                invoice.payment_details = mergedDetails;
                yield invoice.save();
            }
            yield (0, exports.triggerPaymentSuccessReceipt)(order, invoice);
            if (order.user) {
                const userId = ((_b = order.user) === null || _b === void 0 ? void 0 : _b._id) ? String(order.user._id) : String(order.user);
                service_1.NotificationService.createAndDispatch({
                    userId,
                    title: 'Pembayaran Berhasil! 💳',
                    body: `Pembayaran untuk pesanan #${String(order._id).slice(-6).toUpperCase()} berhasil dikonfirmasi. Tim kami sedang menyiapkan pesanan Anda.`,
                    type: 'delivery',
                    data: { orderId: String(order._id), link: '/account/order' },
                }).catch((err) => console.error('[Webhook Notification Error]:', err));
            }
        }
        else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
            order.status_payment = 'cancelled';
            order.status_delivery = 'cancelled';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'cancelled';
                invoice.payment_details = mergedDetails;
                yield invoice.save();
            }
            if (order.user) {
                const userId = ((_c = order.user) === null || _c === void 0 ? void 0 : _c._id) ? String(order.user._id) : String(order.user);
                service_1.NotificationService.sendOrderDeliveryNotification({
                    orderId: String(order._id),
                    userId,
                    deliveryStatus: 'cancelled',
                }).catch((err) => console.error('[Webhook Cancel Notification Error]:', err));
            }
        }
        else if (transactionStatus === 'pending') {
            order.status_payment = 'pending';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'pending';
                invoice.payment_details = mergedDetails;
                yield invoice.save();
            }
        }
        yield order.save();
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('[Midtrans Webhook Error]:', error);
        res.status(200).send('OK');
    }
});
exports.handleMidtransNotification = handleMidtransNotification;
exports.chargeCoreApi = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const coreApi = new midtrans_client_1.default.CoreApi({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    (0, exports.applyMidtransNotificationOverride)(coreApi, ((_a = req.body) === null || _a === void 0 ? void 0 : _a.override_notification_url) || req.headers['x-override-notification']);
    const payload = Object.assign(Object.assign({}, req.body), { user: req.user._id });
    let order = null;
    let isExistingOrder = false;
    const targetOrderId = payload.order_id || payload.orderId;
    if (targetOrderId) {
        order = yield model_1.default.findOne({ _id: targetOrderId, user: req.user._id }).populate('order_items._id');
        if (order && order.status_payment === 'pending') {
            isExistingOrder = true;
        }
    }
    let orderItems = [];
    let orderIdStr = '';
    let calculatedGrossAmount = 0;
    let itemsList = [];
    if (isExistingOrder && order) {
        orderItems = order.order_items;
        orderIdStr = String(order._id);
        calculatedGrossAmount = order.total;
        itemsList = [
            ...orderItems.map((item) => {
                var _a;
                return ({
                    id: (((_a = item._id) === null || _a === void 0 ? void 0 : _a._id) || item._id || 'item').toString().substring(0, 50),
                    price: item.price,
                    quantity: item.quantity || 1,
                    name: (item.name || 'Apple Store Item').substring(0, 50),
                });
            }),
            ...(order.shipping > 0 ? [{ id: 'shipping_cost', price: order.shipping, quantity: 1, name: 'Shipping Cost' }] : []),
            ...(order.tax > 0 ? [{ id: 'tax', price: order.tax, quantity: 1, name: 'Tax' }] : []),
            ...(order.discount > 0 ? [{ id: 'discount', price: -order.discount, quantity: 1, name: 'Discount' }] : []),
        ];
        const sumItems = itemsList.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        if (sumItems > 0 && sumItems !== calculatedGrossAmount) {
            calculatedGrossAmount = sumItems;
            order.total = calculatedGrossAmount;
        }
    }
    else {
        const cart = yield model_3.default.findOne({ user: req.user._id }).populate('products.product');
        const deliveryAddress = yield model_2.default.findById(payload.deliveryAddress);
        if (!deliveryAddress) {
            throw new errors_1.BadRequestError('Delivery address is required');
        }
        if (!cart || !cart.products || cart.products.length === 0) {
            throw new errors_1.BadRequestError('Your cart is empty');
        }
        const validItems = cart.products.filter((item) => item && item.product && item.product._id);
        if (validItems.length === 0) {
            throw new errors_1.BadRequestError('Your cart does not contain valid products');
        }
        orderItems = validItems.map((item) => ({
            _id: item.product._id,
            quantity: item.quantity || 1,
            price: item.product.price,
            name: item.product.name
        }));
        // Server-side authoritative calculation
        const calculatedSubTotal = orderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        const calculatedTax = Math.round(calculatedSubTotal * 0.05);
        const calculatedShipping = calculatedSubTotal > 5000000 ? 0 : 25000;
        const calculatedDiscount = Math.min(calculatedSubTotal, Math.max(0, Number(payload.discount) || 0));
        const calculatedTotal = Math.max(0, calculatedSubTotal + calculatedTax + calculatedShipping - calculatedDiscount);
        order = new model_1.default({
            user: req.user._id,
            order_items: orderItems,
            tax: calculatedTax,
            shipping: calculatedShipping,
            discount: calculatedDiscount,
            total: calculatedTotal,
            payment_method: payload.payment_type || payload.paymentType || 'bank_transfer',
            status_payment: 'pending',
            status_delivery: 'pending',
            delivery_address: {
                provinsi: deliveryAddress.provinsi,
                kabupaten: deliveryAddress.kabupaten,
                name: deliveryAddress.name,
                kecamatan: deliveryAddress.kecamatan,
                kelurahan: deliveryAddress.kelurahan,
                detail: deliveryAddress.detail
            }
        });
        orderIdStr = String(order._id);
        itemsList = [
            ...orderItems.map(item => ({
                id: item._id.toString().substring(0, 50),
                price: item.price,
                quantity: item.quantity,
                name: item.name.substring(0, 50),
            })),
            ...(calculatedShipping > 0 ? [{ id: 'shipping_cost', price: calculatedShipping, quantity: 1, name: 'Shipping Cost' }] : []),
            ...(calculatedTax > 0 ? [{ id: 'tax', price: calculatedTax, quantity: 1, name: 'Tax' }] : []),
            ...(calculatedDiscount > 0 ? [{ id: 'discount', price: -calculatedDiscount, quantity: 1, name: 'Discount' }] : []),
        ];
        calculatedGrossAmount = calculatedTotal;
    }
    const midtransTxOrderId = isExistingOrder ? `${orderIdStr}-${Date.now().toString().slice(-4)}` : orderIdStr;
    const paymentType = payload.payment_type || payload.paymentType || 'bank_transfer';
    const parameter = {
        payment_type: paymentType,
        transaction_details: {
            order_id: midtransTxOrderId,
            gross_amount: calculatedGrossAmount,
        },
        customer_details: {
            first_name: req.user.name,
            last_name: '',
            email: req.user.email,
        },
        item_details: itemsList
    };
    if (paymentType === 'bank_transfer') {
        const bank = (payload.bank || 'bca').toLowerCase();
        if (bank === 'mandiri' || bank === 'echannel') {
            parameter.payment_type = 'echannel';
            parameter.echannel = {
                bill_info1: 'Payment For:',
                bill_info2: `Apple Store Order #${orderIdStr.slice(-6)}`
            };
        }
        else if (bank === 'permata') {
            parameter.payment_type = 'bank_transfer';
            parameter.bank_transfer = { bank: 'permata' };
        }
        else {
            parameter.payment_type = 'bank_transfer';
            parameter.bank_transfer = { bank };
        }
    }
    else if (paymentType === 'echannel') {
        parameter.payment_type = 'echannel';
        parameter.echannel = {
            bill_info1: 'Payment For:',
            bill_info2: `Apple Store Order #${orderIdStr.slice(-6)}`
        };
    }
    else if (paymentType === 'qris') {
        parameter.payment_type = 'qris';
        parameter.qris = { acquirer: 'gopay' };
    }
    else if (paymentType === 'gopay') {
        const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
        parameter.payment_type = 'gopay';
        parameter.gopay = {
            enable_callback: true,
            callback_url: `${clientUrl}/account/order`
        };
    }
    else if (paymentType === 'cstore') {
        parameter.payment_type = 'cstore';
        parameter.cstore = {
            store: payload.store || 'indomaret',
            message: `Apple Store Order #${orderIdStr.slice(-6)}`
        };
    }
    const chargeResponse = yield coreApi.charge(parameter);
    if (!isExistingOrder) {
        yield model_3.default.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } });
    }
    order.token = chargeResponse.transaction_id || chargeResponse.order_id || midtransTxOrderId;
    order.payment_method = chargeResponse.payment_type || paymentType;
    order.payment_details = chargeResponse;
    if (chargeResponse.actions && chargeResponse.actions.length > 0) {
        const qrAction = chargeResponse.actions.find((a) => a.name === 'generate-qr-code');
        const deepLinkAction = chargeResponse.actions.find((a) => a.name === 'deeplink-redirect');
        if (qrAction) {
            order.url_redirect = qrAction.url;
        }
        else if (deepLinkAction) {
            order.url_redirect = deepLinkAction.url;
        }
    }
    yield order.save();
    yield order.populate('order_items._id');
    const response = response_1.ApiResponse.success({
        status: 'success',
        order,
        charge: chargeResponse
    }, 'Payment charged successfully');
    res.status(200).json(response);
}));
exports.getPaymentStatus = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = req.params.id;
    const order = yield model_1.default.findById(orderId).populate('order_items._id');
    if (!order) {
        throw new errors_1.NotFoundError('Order not found');
    }
    const coreApi = new midtrans_client_1.default.CoreApi({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    const orderIdStr = String(order._id);
    const identifier = order.token || orderIdStr;
    let midtransStatus = null;
    try {
        midtransStatus = yield coreApi.transaction.status(identifier);
    }
    catch (_a) {
        try {
            midtransStatus = yield coreApi.transaction.status(orderIdStr);
        }
        catch (innerErr) {
            console.warn('Midtrans status check skipped or not yet available:', innerErr);
        }
    }
    if (midtransStatus) {
        const transactionStatus = midtransStatus.transaction_status;
        const fraudStatus = midtransStatus.fraud_status;
        const invoice = yield model_4.default.findOne({ order: order._id });
        const existingDetails = order.payment_details || {};
        const mergedDetails = Object.assign(Object.assign(Object.assign({}, existingDetails), midtransStatus), { actions: (midtransStatus.actions && midtransStatus.actions.length > 0) ? midtransStatus.actions : existingDetails.actions, qr_string: midtransStatus.qr_string || existingDetails.qr_string, va_numbers: (midtransStatus.va_numbers && midtransStatus.va_numbers.length > 0) ? midtransStatus.va_numbers : existingDetails.va_numbers, permata_va_number: midtransStatus.permata_va_number || existingDetails.permata_va_number, bill_key: midtransStatus.bill_key || existingDetails.bill_key, biller_code: midtransStatus.biller_code || existingDetails.biller_code, payment_code: midtransStatus.payment_code || existingDetails.payment_code });
        order.payment_details = mergedDetails;
        if (transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')) {
            order.status_payment = 'completed';
            if (invoice) {
                invoice.payment_method = midtransStatus.payment_type;
                invoice.status_payment = 'completed';
                invoice.payment_details = mergedDetails;
                yield invoice.save();
            }
            yield (0, exports.triggerPaymentSuccessReceipt)(order, invoice);
        }
        else if (['cancel', 'expire', 'deny'].includes(transactionStatus)) {
            order.status_payment = 'cancelled';
            if (invoice) {
                invoice.payment_method = midtransStatus.payment_type;
                invoice.status_payment = 'cancelled';
                invoice.payment_details = mergedDetails;
                yield invoice.save();
            }
        }
        yield order.save();
    }
    const response = response_1.ApiResponse.success({
        status: order.status_payment,
        midtransStatus: (midtransStatus === null || midtransStatus === void 0 ? void 0 : midtransStatus.transaction_status) || order.status_payment,
        order,
        charge: order.payment_details || midtransStatus
    }, 'Payment status retrieved');
    res.status(200).json(response);
}));
exports.autoGenerateOrder = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { generateSingleRandomOrder } = yield Promise.resolve().then(() => __importStar(require('../../services/orderScheduler')));
    const result = yield generateSingleRandomOrder();
    const response = response_1.ApiResponse.success(result, 'Daily order generated successfully');
    res.status(201).json(response);
}));
