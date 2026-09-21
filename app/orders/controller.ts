import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import middtransClient from 'midtrans-client';
import Orders, { Order, OrderItem } from './model';
import DeliveryAddresses, { DeliveryAddress } from "../deliveryAddress/model";
import Carts, { Cart } from "../cart/model";
import Invoices, { Invoice } from "../invoices/model";
import { ApiResponse } from "../../types/response";
import { NotFoundError, BadRequestError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";
import { NotificationService } from "../notifications/service";
import { EmailService } from "../services/emailService";

export const triggerPaymentSuccessReceipt = async (order: Order, invoice?: Invoice | null) => {
    try {
        if (order.receipt_sent) return;
        order.receipt_sent = true;
        await order.save();

        const populatedOrder = await Orders.findById(order._id).populate('user').populate('order_items._id');
        const userDoc: any = populatedOrder?.user;
        if (userDoc && userDoc.email) {
            let inv = invoice;
            if (!inv) {
                try {
                    inv = await Invoices.findOne({ order: order._id });
                } catch {
                    inv = null;
                }
            }
            EmailService.sendPaymentReceiptEmail({
                order: populatedOrder,
                user: userDoc,
                invoice: inv,
            }).catch((err) => console.error('[Receipt Email Error]:', err));
        }
    } catch (error) {
        console.error('[Receipt Dispatch Error]:', error);
    }
};

export const applyMidtransNotificationOverride = (client: any, customOverrideUrl?: string) => {
    let overrideUrl = (customOverrideUrl || process.env.MIDTRANS_OVERRIDE_NOTIFICATION_URL || process.env.MIDTRANS_NOTIFICATION_URL || '').trim();
    const appendUrl = (process.env.MIDTRANS_APPEND_NOTIFICATION_URL || '').trim();

    if (overrideUrl) {
        try {
            const parsed = new URL(overrideUrl);
            if (!parsed.hostname) {
                overrideUrl = '';
            }
        } catch {
            overrideUrl = '';
        }
    }

    if (overrideUrl && client?.httpClient?.http_client) {
        client.httpClient.http_client.defaults.headers.common = client.httpClient.http_client.defaults.headers.common || {};
        client.httpClient.http_client.defaults.headers.common['X-Override-Notification'] = overrideUrl;

        client.httpClient.http_client.interceptors.request.use((config: any) => {
            config.headers = config.headers || {};
            config.headers['X-Override-Notification'] = overrideUrl;
            return config;
        });
    }

    if (appendUrl && client?.httpClient?.http_client) {
        client.httpClient.http_client.defaults.headers.common = client.httpClient.http_client.defaults.headers.common || {};
        client.httpClient.http_client.defaults.headers.common['X-Append-Notification'] = appendUrl;

        client.httpClient.http_client.interceptors.request.use((config: any) => {
            config.headers = config.headers || {};
            config.headers['X-Append-Notification'] = appendUrl;
            return config;
        });
    }
};

export const createOrder = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const snap = new middtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    applyMidtransNotificationOverride(snap, req.body?.override_notification_url || (req.headers['x-override-notification'] as string));
    const payload = { ...req.body, user: req.user!._id };
    const cart: Cart | null = await Carts.findOne({ user: req.user!._id }).populate('products.product');
    const deliveryAddress: DeliveryAddress | null = await DeliveryAddresses.findById(payload.deliveryAddress);

    if (!deliveryAddress) {
        throw new BadRequestError('Delivery address not found');
    }
    if (!cart || !cart.products || cart.products.length === 0) {
        throw new BadRequestError('Cart is empty');
    }

    const validItems = cart.products.filter((item: any) => item && item.product && item.product._id);
    if (validItems.length === 0) {
        throw new BadRequestError('Cart does not contain valid products');
    }

    const orderItems: OrderItem[] = validItems.map((item: any) => ({
        _id: item.product._id,
        quantity: item.quantity || 1,
        price: item.product.price,
        name: item.product.name
    }));

    // Server-side authoritative calculation
    const calculatedSubTotal = orderItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.quantity), 0);
    const calculatedTax = Math.round(calculatedSubTotal * 0.05);
    const calculatedShipping = calculatedSubTotal > 5000000 ? 0 : 25000;
    const calculatedDiscount = Math.min(calculatedSubTotal, Math.max(0, Number(payload.discount) || 0));
    const calculatedTotal = Math.max(0, calculatedSubTotal + calculatedTax + calculatedShipping - calculatedDiscount);

    const order: Order = new Orders({
        user: req.user!._id,
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
            order_id: String((order as any)._id),
            gross_amount: calculatedTotal,
        },
        credit_card: {
            secure: true
        },
        customer_details: {
            first_name: req.user!.name,
            last_name: '',
            name: req.user!.name,
            email: req.user!.email,
        },
        item_details: itemsList,
    };

    const transaction: any = await snap.createTransaction(parameter);
    await Carts.findOneAndUpdate({ user: req.user!._id }, { $set: { products: [] } });

    order.token = transaction.token;
    order.url_redirect = transaction.redirect_url;
    await order.save();

    const response = ApiResponse.success({
        url: transaction.redirect_url,
        token: transaction.token,
    }, 'Order created successfully');

    res.status(200).json(response);
});

export const getOrders = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { skip, limit, page, status } = req.query;
    const filter: any = { user: req.user!._id };

    if (status && typeof status === 'string' && status !== 'all') {
        const statusLower = status.toLowerCase();
        if (statusLower === 'completed' || statusLower === 'paid') {
            filter.status_payment = { $in: ['completed', 'paid', 'settlement'] };
        } else if (statusLower === 'pending') {
            filter.status_payment = { $in: ['pending', 'waiting'] };
        } else if (statusLower === 'cancelled' || statusLower === 'expired') {
            filter.status_payment = { $in: ['cancelled', 'cancel', 'expire', 'expired', 'deny', 'failure'] };
        } else {
            filter.status_payment = status;
        }
    }

    const count = await Orders.countDocuments(filter);

    let query = Orders.find(filter)
        .populate('order_items._id')
        .sort({ createdAt: -1 });

    const isPaginated = page !== undefined || limit !== undefined || skip !== undefined;
    const parsedLimit = isPaginated ? Math.max(1, parseInt(limit as string) || 5) : 0;
    const parsedPage = isPaginated ? Math.max(1, parseInt(page as string) || 1) : 1;
    const parsedSkip = skip !== undefined ? Math.max(0, parseInt(skip as string) || 0) : (parsedPage - 1) * parsedLimit;

    if (isPaginated && parsedLimit > 0) {
        query = query.skip(parsedSkip).limit(parsedLimit);
    }

    const orders: Order[] = await query;
    const totalPages = isPaginated && parsedLimit > 0 ? Math.max(1, Math.ceil(count / parsedLimit)) : 1;

    const response = ApiResponse.success(orders, 'User orders retrieved successfully');
    (response as any).orders = orders;
    (response as any).count = count;
    (response as any).total = count;
    (response as any).totalPages = totalPages;
    (response as any).currentPage = parsedPage;
    (response as any).limit = parsedLimit > 0 ? parsedLimit : count;
    res.status(200).json(response);
});

export const updateOrder = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const status_delivery = req.body.status_delivery;
    const existingOrder = await Orders.findById(req.params.id);

    if (!existingOrder) {
        throw new NotFoundError('Order not found');
    }

    const previousStatus = existingOrder.status_delivery;
    existingOrder.status_delivery = status_delivery;
    await existingOrder.save();

    // Trigger push notification if status has changed and order has a customer user
    if (status_delivery && status_delivery !== previousStatus && existingOrder.user) {
        const userId = (existingOrder.user as any)?._id
            ? String((existingOrder.user as any)._id)
            : String(existingOrder.user);

        NotificationService.sendOrderDeliveryNotification({
            orderId: String(existingOrder._id),
            userId,
            deliveryStatus: status_delivery,
        }).catch((err) => console.error('Failed to dispatch delivery push notification:', err));
    }

    const response = ApiResponse.success({ order: existingOrder, message: 'Order updated' }, 'Order updated successfully');
    res.status(200).json(response);
});

export const getAllOrders = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { skip, limit } = req.query;
    const parsedSkip = parseInt(skip as string) || 0;
    const parsedLimit = parseInt(limit as string) || 12;

    const orders: Order[] = await Orders.find({ payment_method: { $ne: '', $exists: true } })
        .populate('user', 'name email avatar')
        .populate('order_items._id')
        .sort({ createdAt: -1 })
        .skip(parsedSkip)
        .limit(parsedLimit);

    const count = await Orders.countDocuments({ payment_method: { $ne: '', $exists: true } });
    const page: number = count === 0 ? 1 : Math.ceil(count / 12);

    const response = ApiResponse.success({ orders, count, page }, 'Orders retrieved successfully');
    res.status(200).json(response);
});

export const getOrder = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const order: Order | null = await Orders.findById(req.params.id)
        .populate('user', 'name email avatar')
        .populate('order_items._id');
    if (!order) {
        throw new NotFoundError('Order not found');
    }

    const response = ApiResponse.success(order, 'Order retrieved successfully');
    res.status(200).json(response);
});

export const handleMidtransNotification = async (req: Request, res: Response) => {
    try {
        const snap = new middtransClient.Snap({
            isProduction: false,
            serverKey: process.env.MIDTRANS_SERVER_KEY,
        });
        const notification = req.body;
        let statusResponse = notification;
        try {
            statusResponse = await snap.transaction.notification(notification);
        } catch {
            statusResponse = notification;
        }

        const rawOrderId = String(statusResponse.order_id || '');
        const cleanOrderId = rawOrderId.split('-')[0];
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        const isCleanIdValid = mongoose.Types.ObjectId.isValid(cleanOrderId);
        const order: Order | null = (isCleanIdValid ? await Orders.findById(cleanOrderId) : null) ||
            await Orders.findOne({ token: statusResponse.transaction_id }) ||
            await Orders.findOne({ token: rawOrderId });

        if (!order) {
            return res.status(200).send('OK');
        }

        const resolvedOrderId = order._id;
        const invoice: Invoice | null = await Invoices.findOne({ order: resolvedOrderId });

        const existingDetails = (order as any).payment_details || {};
        const mergedDetails = {
            ...existingDetails,
            ...statusResponse,
            actions: (statusResponse.actions && statusResponse.actions.length > 0) ? statusResponse.actions : existingDetails.actions,
            qr_string: statusResponse.qr_string || existingDetails.qr_string,
            va_numbers: (statusResponse.va_numbers && statusResponse.va_numbers.length > 0) ? statusResponse.va_numbers : existingDetails.va_numbers,
            permata_va_number: statusResponse.permata_va_number || existingDetails.permata_va_number,
            bill_key: statusResponse.bill_key || existingDetails.bill_key,
            biller_code: statusResponse.biller_code || existingDetails.biller_code,
            payment_code: statusResponse.payment_code || existingDetails.payment_code,
        };

        order.payment_method = statusResponse.payment_type || order.payment_method;
        (order as any).payment_details = mergedDetails;

        if (transactionStatus === 'capture') {
            if (fraudStatus === 'accept') {
                order.status_payment = 'completed';
                if (invoice) {
                    invoice.payment_method = statusResponse.payment_type;
                    invoice.status_payment = 'completed';
                    (invoice as any).payment_details = mergedDetails;
                    await invoice.save();
                }
                await triggerPaymentSuccessReceipt(order, invoice);
                if (order.user) {
                    const userId = (order.user as any)?._id ? String((order.user as any)._id) : String(order.user);
                    NotificationService.createAndDispatch({
                        userId,
                        title: 'Pembayaran Diterima! 💳',
                        body: `Pembayaran untuk pesanan #${String(order._id).slice(-6).toUpperCase()} berhasil dikonfirmasi. Tim kami sedang menyiapkan pesanan Anda.`,
                        type: 'delivery',
                        data: { orderId: String(order._id), link: '/account/order' },
                    }).catch((err) => console.error('[Webhook Notification Error]:', err));
                }
            }
        } else if (transactionStatus === 'settlement') {
            order.status_payment = 'completed';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'completed';
                (invoice as any).payment_details = mergedDetails;
                await invoice.save();
            }
            await triggerPaymentSuccessReceipt(order, invoice);
            if (order.user) {
                const userId = (order.user as any)?._id ? String((order.user as any)._id) : String(order.user);
                NotificationService.createAndDispatch({
                    userId,
                    title: 'Pembayaran Berhasil! 💳',
                    body: `Pembayaran untuk pesanan #${String(order._id).slice(-6).toUpperCase()} berhasil dikonfirmasi. Tim kami sedang menyiapkan pesanan Anda.`,
                    type: 'delivery',
                    data: { orderId: String(order._id), link: '/account/order' },
                }).catch((err) => console.error('[Webhook Notification Error]:', err));
            }
        } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
            order.status_payment = 'cancelled';
            order.status_delivery = 'cancelled';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'cancelled';
                (invoice as any).payment_details = mergedDetails;
                await invoice.save();
            }
            if (order.user) {
                const userId = (order.user as any)?._id ? String((order.user as any)._id) : String(order.user);
                NotificationService.sendOrderDeliveryNotification({
                    orderId: String(order._id),
                    userId,
                    deliveryStatus: 'cancelled',
                }).catch((err) => console.error('[Webhook Cancel Notification Error]:', err));
            }
        } else if (transactionStatus === 'pending') {
            order.status_payment = 'pending';
            if (invoice) {
                invoice.payment_method = statusResponse.payment_type;
                invoice.status_payment = 'pending';
                (invoice as any).payment_details = mergedDetails;
                await invoice.save();
            }
        }

        await order.save();
        res.status(200).send('OK');
    } catch (error) {
        console.error('[Midtrans Webhook Error]:', error);
        res.status(200).send('OK');
    }
};

export const chargeCoreApi = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const coreApi = new middtransClient.CoreApi({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
    applyMidtransNotificationOverride(coreApi, req.body?.override_notification_url || (req.headers['x-override-notification'] as string));

    const payload = { ...req.body, user: req.user!._id };
    let order: Order | null = null;
    let isExistingOrder = false;

    const targetOrderId = payload.order_id || payload.orderId;
    if (targetOrderId) {
        order = await Orders.findOne({ _id: targetOrderId, user: req.user!._id }).populate('order_items._id');
        if (order && order.status_payment === 'pending') {
            isExistingOrder = true;
        }
    }

    let orderItems: OrderItem[] = [];
    let orderIdStr = '';
    let calculatedGrossAmount = 0;
    let itemsList: any[] = [];

    if (isExistingOrder && order) {
        orderItems = order.order_items;
        orderIdStr = String((order as any)._id);
        calculatedGrossAmount = order.total;
        itemsList = [
            ...orderItems.map((item: any) => ({
                id: (item._id?._id || item._id || 'item').toString().substring(0, 50),
                price: item.price,
                quantity: item.quantity || 1,
                name: (item.name || 'Apple Store Item').substring(0, 50),
            })),
            ...(order.shipping > 0 ? [{ id: 'shipping_cost', price: order.shipping, quantity: 1, name: 'Shipping Cost' }] : []),
            ...(order.tax > 0 ? [{ id: 'tax', price: order.tax, quantity: 1, name: 'Tax' }] : []),
            ...(order.discount > 0 ? [{ id: 'discount', price: -order.discount, quantity: 1, name: 'Discount' }] : []),
        ];
        const sumItems = itemsList.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        if (sumItems > 0 && sumItems !== calculatedGrossAmount) {
            calculatedGrossAmount = sumItems;
            order.total = calculatedGrossAmount;
        }
    } else {
        const cart: Cart | null = await Carts.findOne({ user: req.user!._id }).populate('products.product');
        const deliveryAddress: DeliveryAddress | null = await DeliveryAddresses.findById(payload.deliveryAddress);

        if (!deliveryAddress) {
            throw new BadRequestError('Delivery address is required');
        }

        if (!cart || !cart.products || cart.products.length === 0) {
            throw new BadRequestError('Your cart is empty');
        }

        const validItems = cart.products.filter((item: any) => item && item.product && item.product._id);
        if (validItems.length === 0) {
            throw new BadRequestError('Your cart does not contain valid products');
        }

        orderItems = validItems.map((item: any) => ({
            _id: item.product._id,
            quantity: item.quantity || 1,
            price: item.product.price,
            name: item.product.name
        }));

        // Server-side authoritative calculation
        const calculatedSubTotal = orderItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.quantity), 0);
        const calculatedTax = Math.round(calculatedSubTotal * 0.05);
        const calculatedShipping = calculatedSubTotal > 5000000 ? 0 : 25000;
        const calculatedDiscount = Math.min(calculatedSubTotal, Math.max(0, Number(payload.discount) || 0));
        const calculatedTotal = Math.max(0, calculatedSubTotal + calculatedTax + calculatedShipping - calculatedDiscount);

        order = new Orders({
            user: req.user!._id,
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

        orderIdStr = String((order as any)._id);
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

    const parameter: any = {
        payment_type: paymentType,
        transaction_details: {
            order_id: midtransTxOrderId,
            gross_amount: calculatedGrossAmount,
        },
        customer_details: {
            first_name: req.user!.name,
            last_name: '',
            email: req.user!.email,
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
        } else if (bank === 'permata') {
            parameter.payment_type = 'bank_transfer';
            parameter.bank_transfer = { bank: 'permata' };
        } else {
            parameter.payment_type = 'bank_transfer';
            parameter.bank_transfer = { bank };
        }
    } else if (paymentType === 'echannel') {
        parameter.payment_type = 'echannel';
        parameter.echannel = {
            bill_info1: 'Payment For:',
            bill_info2: `Apple Store Order #${orderIdStr.slice(-6)}`
        };
    } else if (paymentType === 'qris') {
        parameter.payment_type = 'qris';
        parameter.qris = { acquirer: 'gopay' };
    } else if (paymentType === 'gopay') {
        const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
        parameter.payment_type = 'gopay';
        parameter.gopay = {
            enable_callback: true,
            callback_url: `${clientUrl}/account/order`
        };
    } else if (paymentType === 'cstore') {
        parameter.payment_type = 'cstore';
        parameter.cstore = {
            store: payload.store || 'indomaret',
            message: `Apple Store Order #${orderIdStr.slice(-6)}`
        };
    }

    const chargeResponse = await coreApi.charge(parameter);

    if (!isExistingOrder) {
        await Carts.findOneAndUpdate(
            { user: req.user!._id },
            { $set: { products: [] } }
        );
    }

    order!.token = chargeResponse.transaction_id || chargeResponse.order_id || midtransTxOrderId;
    order!.payment_method = chargeResponse.payment_type || paymentType;
    (order as any).payment_details = chargeResponse;

    if (chargeResponse.actions && chargeResponse.actions.length > 0) {
        const qrAction = chargeResponse.actions.find((a: any) => a.name === 'generate-qr-code');
        const deepLinkAction = chargeResponse.actions.find((a: any) => a.name === 'deeplink-redirect');
        if (qrAction) {
            order!.url_redirect = qrAction.url;
        } else if (deepLinkAction) {
            order!.url_redirect = deepLinkAction.url;
        }
    }

    await order!.save();
    await order!.populate('order_items._id');

    const response = ApiResponse.success({
        status: 'success',
        order,
        charge: chargeResponse
    }, 'Payment charged successfully');

    res.status(200).json(response);
});

export const getPaymentStatus = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const order: Order | null = await Orders.findById(orderId).populate('order_items._id');
    if (!order) {
        throw new NotFoundError('Order not found');
    }

    const coreApi = new middtransClient.CoreApi({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const orderIdStr = String((order as any)._id);
    const identifier = order.token || orderIdStr;
    let midtransStatus: any = null;

    try {
        midtransStatus = await coreApi.transaction.status(identifier);
    } catch {
        try {
            midtransStatus = await coreApi.transaction.status(orderIdStr);
        } catch (innerErr) {
            console.warn('Midtrans status check skipped or not yet available:', innerErr);
        }
    }

    if (midtransStatus) {
        const transactionStatus = midtransStatus.transaction_status;
        const fraudStatus = midtransStatus.fraud_status;
        const invoice: Invoice | null = await Invoices.findOne({ order: (order as any)._id });

        const existingDetails = (order as any).payment_details || {};
        const mergedDetails = {
            ...existingDetails,
            ...midtransStatus,
            actions: (midtransStatus.actions && midtransStatus.actions.length > 0) ? midtransStatus.actions : existingDetails.actions,
            qr_string: midtransStatus.qr_string || existingDetails.qr_string,
            va_numbers: (midtransStatus.va_numbers && midtransStatus.va_numbers.length > 0) ? midtransStatus.va_numbers : existingDetails.va_numbers,
            permata_va_number: midtransStatus.permata_va_number || existingDetails.permata_va_number,
            bill_key: midtransStatus.bill_key || existingDetails.bill_key,
            biller_code: midtransStatus.biller_code || existingDetails.biller_code,
            payment_code: midtransStatus.payment_code || existingDetails.payment_code,
        };

        (order as any).payment_details = mergedDetails;

        if (transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')) {
            order.status_payment = 'completed';
            if (invoice) {
                invoice.payment_method = midtransStatus.payment_type;
                invoice.status_payment = 'completed';
                (invoice as any).payment_details = mergedDetails;
                await invoice.save();
            }
            await triggerPaymentSuccessReceipt(order, invoice);
        } else if (['cancel', 'expire', 'deny'].includes(transactionStatus)) {
            order.status_payment = 'cancelled';
            if (invoice) {
                invoice.payment_method = midtransStatus.payment_type;
                invoice.status_payment = 'cancelled';
                (invoice as any).payment_details = mergedDetails;
                await invoice.save();
            }
        }
        await order.save();
    }

    const response = ApiResponse.success({
        status: order.status_payment,
        midtransStatus: midtransStatus?.transaction_status || order.status_payment,
        order,
        charge: (order as any).payment_details || midtransStatus
    }, 'Payment status retrieved');

    res.status(200).json(response);
});

export const autoGenerateOrder = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { generateSingleRandomOrder } = await import('../../services/orderScheduler');
    const result = await generateSingleRandomOrder();
    const response = ApiResponse.success(result, 'Daily order generated successfully');
    res.status(201).json(response);
});