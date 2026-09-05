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
exports.generateSingleRandomOrder = generateSingleRandomOrder;
exports.startDailyOrderScheduler = startDailyOrderScheduler;
const model_1 = __importDefault(require("../app/orders/model"));
const model_2 = __importDefault(require("../app/invoices/model"));
const model_3 = __importDefault(require("../app/products/model"));
const model_4 = __importDefault(require("../app/users/model"));
const model_5 = __importDefault(require("../app/deliveryAddress/model"));
const auto_generate_orders_1 = require("../scripts/auto-generate-orders");
function generateSingleRandomOrder(customDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield model_4.default.find({ role: 'user' }).lean();
        const allUsers = users.length > 0 ? users : yield model_4.default.find({}).lean();
        const products = yield model_3.default.find({}).lean();
        const addresses = yield model_5.default.find({}).lean();
        if (allUsers.length === 0 || products.length === 0) {
            throw new Error('Cannot generate order: No users or products found in database.');
        }
        const user = allUsers[Math.floor(Math.random() * allUsers.length)];
        const fallbackAddress = {
            name: user.name || 'Pelanggan Apple',
            provinsi: 'DKI JAKARTA',
            kabupaten: 'KOTA JAKARTA SELATAN',
            kecamatan: 'KEBAYORAN BARU',
            kelurahan: 'SENAYAN',
            detail: 'Jl. Jenderal Sudirman No. 52-53, SCBD Suites',
        };
        const address = addresses.length > 0
            ? addresses[Math.floor(Math.random() * addresses.length)]
            : fallbackAddress;
        const date = customDate || new Date();
        const { orderDoc, invoiceDoc } = (0, auto_generate_orders_1.buildRandomOrder)(user, products, address, date);
        const createdOrder = yield model_1.default.create(orderDoc);
        const createdInvoice = yield model_2.default.create(invoiceDoc);
        return { order: createdOrder, invoice: createdInvoice };
    });
}
let schedulerTimer = null;
function startDailyOrderScheduler() {
    console.log('[Daily Order Scheduler] Initializing daily order generator service...');
    // Quick initial check after 10 seconds: ensure today has at least 1 order
    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const countToday = yield model_1.default.countDocuments({
                createdAt: { $gte: todayStart },
            });
            if (countToday === 0) {
                console.log('[Daily Order Scheduler] No order found for today. Generating daily order...');
                const result = yield generateSingleRandomOrder();
                console.log(`[Daily Order Scheduler] Daily order created successfully: ${result.order._id} (${result.order.payment_method})`);
            }
            else {
                console.log(`[Daily Order Scheduler] Today already has ${countToday} orders. Standing by.`);
            }
        }
        catch (err) {
            console.warn('[Daily Order Scheduler] Initialization check warning:', err);
        }
    }), 10000);
    // Interval check every 6 hours: if fewer than 2 orders today, generate an order
    const INTERVAL_MS = 6 * 60 * 60 * 1000;
    schedulerTimer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const countToday = yield model_1.default.countDocuments({
                createdAt: { $gte: todayStart },
            });
            if (countToday < 5) {
                console.log('[Daily Order Scheduler] Generating automated daily order...');
                const result = yield generateSingleRandomOrder();
                console.log(`[Daily Order Scheduler] Generated order: ${result.order._id} - Total: Rp ${(_a = result.order.total) === null || _a === void 0 ? void 0 : _a.toLocaleString('id-ID')}`);
            }
        }
        catch (err) {
            console.error('[Daily Order Scheduler] Error during periodic execution:', err);
        }
    }), INTERVAL_MS);
}
