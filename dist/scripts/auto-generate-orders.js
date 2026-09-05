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
exports.buildRandomOrder = buildRandomOrder;
exports.seedHistoricalOrders = seedHistoricalOrders;
const mongoose_1 = __importStar(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const model_1 = __importDefault(require("../app/orders/model"));
const model_2 = __importDefault(require("../app/invoices/model"));
const model_3 = __importDefault(require("../app/products/model"));
const model_4 = __importDefault(require("../app/users/model"));
const model_5 = __importDefault(require("../app/deliveryAddress/model"));
dotenv_1.default.config();
const indonesianAddresses = [
    {
        name: 'Rumah Jakarta',
        provinsi: 'DKI JAKARTA',
        kabupaten: 'KOTA JAKARTA SELATAN',
        kecamatan: 'KEBAYORAN BARU',
        kelurahan: 'SENAYAN',
        detail: 'Jl. Jenderal Sudirman No. 52-53, Kawasan SCBD Tower A Lt. 12',
    },
    {
        name: 'Kantor Mega Kuningan',
        provinsi: 'DKI JAKARTA',
        kabupaten: 'KOTA JAKARTA SELATAN',
        kecamatan: 'SETIABUDI',
        kelurahan: 'KUNINGAN TIMUR',
        detail: 'Menara Cyber 2 Lt. 18, Jl. HR Rasuna Said Blok X-5 Kav. 13',
    },
    {
        name: 'Rumah Bandung',
        provinsi: 'JAWA BARAT',
        kabupaten: 'KOTA BANDUNG',
        kecamatan: 'COBLONG',
        kelurahan: 'DAGO',
        detail: 'Jl. Ir. H. Juanda No. 128, Perumahan Dago Asri Blok C-15',
    },
    {
        name: 'Apartemen Surabaya',
        provinsi: 'JAWA TIMUR',
        kabupaten: 'KOTA SURABAYA',
        kecamatan: 'GUBENG',
        kelurahan: 'AIRLANGGA',
        detail: 'Grand Dharmahusada Lagoon Tower B Unit 2108, Jl. Raya Dharmahusada',
    },
    {
        name: 'Villa Bali',
        provinsi: 'BALI',
        kabupaten: 'KABUPATEN BADUNG',
        kecamatan: 'KUTA UTARA',
        kelurahan: 'CANGGU',
        detail: 'Jl. Pantai Batu Bolong No. 45B, Canggu Eco Residence',
    },
];
const paymentMethods = [
    'bca_va',
    'mandiri_va',
    'bni_va',
    'bri_va',
    'gopay',
    'qris',
    'credit_card',
];
function buildRandomOrder(user, allProducts, address, date, forceStatus) {
    // Pick 1-3 distinct products
    const numItems = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, numItems);
    const orderItems = selectedProducts.map((p) => {
        const qty = Math.floor(Math.random() * 2) + 1; // 1 or 2
        return {
            _id: p._id,
            name: p.name,
            price: p.price,
            quantity: qty,
        };
    });
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.11); // 11% PPN
    const shipping = subtotal > 15000000 ? 0 : 50000;
    const hasDiscount = Math.random() > 0.6;
    const discount = hasDiscount ? (subtotal > 20000000 ? 1000000 : 500000) : 0;
    const total = subtotal + tax + shipping - discount;
    const now = new Date('2026-09-06T01:50:00.000Z');
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
    let status_payment = forceStatus === null || forceStatus === void 0 ? void 0 : forceStatus.payment;
    if (!status_payment) {
        if (daysDiff > 5) {
            status_payment = Math.random() < 0.88 ? 'completed' : 'cancelled';
        }
        else {
            const rand = Math.random();
            if (rand < 0.70)
                status_payment = 'completed';
            else if (rand < 0.90)
                status_payment = 'pending';
            else
                status_payment = 'cancelled';
        }
    }
    let status_delivery = forceStatus === null || forceStatus === void 0 ? void 0 : forceStatus.delivery;
    if (!status_delivery) {
        if (status_payment === 'completed') {
            if (daysDiff > 3)
                status_delivery = 'delivered';
            else if (daysDiff > 1)
                status_delivery = 'process';
            else
                status_delivery = 'pending';
        }
        else if (status_payment === 'cancelled') {
            status_delivery = 'cancelled';
        }
        else {
            status_delivery = 'pending';
        }
    }
    const payment_method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const token = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const orderId = new mongoose_1.Types.ObjectId();
    const orderDoc = {
        _id: orderId,
        user: user._id,
        order_items: orderItems,
        delivery_address: {
            provinsi: address.provinsi,
            kabupaten: address.kabupaten,
            name: user.name || address.name,
            kecamatan: address.kecamatan,
            kelurahan: address.kelurahan,
            detail: address.detail,
        },
        total,
        tax,
        shipping,
        discount,
        status_payment,
        status_delivery,
        payment_method,
        token,
        url_redirect: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`,
        createdAt: date,
        updatedAt: date,
    };
    const invoiceDoc = {
        _id: new mongoose_1.Types.ObjectId(),
        order: orderId,
        user: user._id,
        delivery_address: orderDoc.delivery_address,
        quantity: orderItems.reduce((acc, i) => acc + i.quantity, 0),
        total,
        tax,
        shipping,
        discount,
        status_payment,
        status_delivery,
        payment_method,
        createdAt: date,
        updatedAt: date,
    };
    return { orderDoc, invoiceDoc };
}
function seedHistoricalOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Fetching users and products for order generation...');
        const users = yield model_4.default.find({}).lean();
        const products = yield model_3.default.find({}).lean();
        const existingAddresses = yield model_5.default.find({}).lean();
        if (users.length === 0 || products.length === 0) {
            throw new Error('Users and products must be present before seeding orders.');
        }
        const addresses = existingAddresses.length > 0 ? existingAddresses : indonesianAddresses;
        console.log('Cleaning old orders and invoices...');
        yield model_1.default.deleteMany({});
        yield model_2.default.deleteMany({});
        console.log('Orders and invoices cleared.');
        console.log('Generating realistic monthly & daily orders for 2026...');
        const ordersToInsert = [];
        const invoicesToInsert = [];
        // Monthly order targets for 2026 (Jan - Aug)
        const monthlyPlan = [
            { month: 0, daysInMonth: 31, count: 12 }, // Jan
            { month: 1, daysInMonth: 28, count: 14 }, // Feb
            { month: 2, daysInMonth: 31, count: 18 }, // Mar
            { month: 3, daysInMonth: 30, count: 20 }, // Apr
            { month: 4, daysInMonth: 31, count: 24 }, // May
            { month: 5, daysInMonth: 30, count: 26 }, // Jun
            { month: 6, daysInMonth: 31, count: 30 }, // Jul
            { month: 7, daysInMonth: 31, count: 35 }, // Aug
        ];
        for (const p of monthlyPlan) {
            for (let i = 0; i < p.count; i++) {
                const day = Math.floor(Math.random() * p.daysInMonth) + 1;
                const hour = Math.floor(Math.random() * 14) + 8; // 08:00 - 22:00
                const minute = Math.floor(Math.random() * 60);
                const date = new Date(2026, p.month, day, hour, minute);
                const user = users[Math.floor(Math.random() * users.length)];
                const address = addresses[Math.floor(Math.random() * addresses.length)];
                const { orderDoc, invoiceDoc } = buildRandomOrder(user, products, address, date);
                ordersToInsert.push(orderDoc);
                invoicesToInsert.push(invoiceDoc);
            }
        }
        // Daily orders for September 2026 (Sept 1 to Sept 6)
        // Ensure the primary demo customer (ekasyafrinonazhifan@gmail.com) has active orders!
        const primaryCustomer = users.find((u) => u.email === 'ekasyafrinonazhifan@gmail.com') || users[0];
        for (let day = 1; day <= 6; day++) {
            const ordersPerDay = day === 6 ? 4 : Math.floor(Math.random() * 3) + 3; // 3-5 orders daily
            for (let j = 0; j < ordersPerDay; j++) {
                const hour = day === 6 ? Math.min(Math.floor(Math.random() * 12) + 1, 1) : Math.floor(Math.random() * 14) + 8;
                const minute = Math.floor(Math.random() * 60);
                const date = new Date(2026, 8, day, hour, minute); // Month 8 is September (0-indexed)
                // Guarantee at least 1 order per day for primaryCustomer
                const user = j === 0 ? primaryCustomer : users[Math.floor(Math.random() * users.length)];
                const address = addresses[Math.floor(Math.random() * addresses.length)];
                const { orderDoc, invoiceDoc } = buildRandomOrder(user, products, address, date);
                ordersToInsert.push(orderDoc);
                invoicesToInsert.push(invoiceDoc);
            }
        }
        // Ensure primaryCustomer also has 1 pending order and 1 completed order today
        const pendingToday = buildRandomOrder(primaryCustomer, products, addresses[0], new Date(2026, 8, 6, 0, 45), {
            payment: 'pending',
            delivery: 'pending',
        });
        ordersToInsert.push(pendingToday.orderDoc);
        invoicesToInsert.push(pendingToday.invoiceDoc);
        console.log(`Inserting ${ordersToInsert.length} orders & invoices with custom timestamps...`);
        yield model_1.default.insertMany(ordersToInsert);
        yield model_2.default.insertMany(invoicesToInsert);
        console.log(`Successfully seeded ${ordersToInsert.length} orders and invoices across 2026!`);
    });
}
if (require.main === module) {
    const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
    mongoose_1.default.connect(dbUri).then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield seedHistoricalOrders();
        yield mongoose_1.default.disconnect();
        process.exit(0);
    })).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
