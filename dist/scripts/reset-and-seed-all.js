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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const model_1 = __importDefault(require("../app/users/model"));
const model_2 = __importDefault(require("../app/cart/model"));
const model_3 = __importDefault(require("../app/products/model"));
const model_4 = __importDefault(require("../app/orders/model"));
const model_5 = __importDefault(require("../app/invoices/model"));
const model_6 = __importDefault(require("../app/categories/model"));
const model_7 = __importDefault(require("../app/deliveryAddress/model"));
const seed_apple_products_1 = require("./seed-apple-products");
const auto_generate_orders_1 = require("./auto-generate-orders");
dotenv_1.default.config();
function resetAndSeedAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('======================================================');
        console.log('       CYBER APPLE STORE - RESET & MASTER SEEDER      ');
        console.log('======================================================\n');
        const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
        console.log(`Connecting to MongoDB (${process.env.DB_NAME})...`);
        yield mongoose_1.default.connect(dbUri);
        console.log('Connected to MongoDB.\n');
        // Step 1: Ensure Essential Users & Admins
        console.log('--- Step 1: Checking & Ensuring Essential Accounts ---');
        const salt = yield bcrypt_1.default.genSalt(10);
        const adminPasswordHash = yield bcrypt_1.default.hash('admin123', salt);
        const userPasswordHash = yield bcrypt_1.default.hash('user123', salt);
        // Admin Account 1: admin@cyber.store
        let admin = yield model_1.default.findOne({ email: 'admin@cyber.store' });
        if (!admin) {
            admin = yield model_1.default.create({
                name: 'Cyber Store Admin',
                email: 'admin@cyber.store',
                password: adminPasswordHash,
                role: 'admin',
            });
            console.log('  + Created admin: admin@cyber.store / admin123');
        }
        else {
            admin.role = 'admin';
            if (!admin.password)
                admin.password = adminPasswordHash;
            yield admin.save();
            console.log('  * Preserved admin: admin@cyber.store');
        }
        // Admin Account 2: bloodsuker18@gmail.com
        let rootAdmin = yield model_1.default.findOne({ email: 'bloodsuker18@gmail.com' });
        if (rootAdmin) {
            rootAdmin.role = 'admin';
            yield rootAdmin.save();
            console.log('  * Preserved admin: bloodsuker18@gmail.com');
        }
        // Demo User Account: ekasyafrinonazhifan@gmail.com
        let demoUser = yield model_1.default.findOne({ email: 'ekasyafrinonazhifan@gmail.com' });
        if (!demoUser) {
            demoUser = yield model_1.default.create({
                name: 'Eka Syafrino Nazhifan',
                email: 'ekasyafrinonazhifan@gmail.com',
                password: userPasswordHash,
                role: 'user',
            });
            console.log('  + Created user: ekasyafrinonazhifan@gmail.com / user123');
        }
        else {
            if (!demoUser.password) {
                demoUser.password = userPasswordHash;
                yield demoUser.save();
            }
            console.log('  * Preserved user: ekasyafrinonazhifan@gmail.com');
        }
        // Step 2: Ensure Sample Delivery Addresses exist for demoUser
        const existingAddresses = yield model_7.default.find({ user: demoUser._id });
        if (existingAddresses.length === 0) {
            yield model_7.default.create([
                {
                    name: 'Rumah Utama Eka',
                    provinsi: 'DKI JAKARTA',
                    kabupaten: 'KOTA JAKARTA SELATAN',
                    kecamatan: 'KEBAYORAN BARU',
                    kelurahan: 'SENAYAN',
                    detail: 'Jl. Jenderal Sudirman No. 52-53, SCBD Residence Tower A Lt. 12',
                    user: demoUser._id,
                },
                {
                    name: 'Kantor Cyber',
                    provinsi: 'DKI JAKARTA',
                    kabupaten: 'KOTA JAKARTA SELATAN',
                    kecamatan: 'SETIABUDI',
                    kelurahan: 'KUNINGAN TIMUR',
                    detail: 'Menara Cyber 2 Lt. 18, Jl. HR Rasuna Said Blok X-5',
                    user: demoUser._id,
                },
            ]);
            console.log('  + Created 2 delivery addresses for demo user.');
        }
        // Step 3: Clear Carts
        console.log('\n--- Step 2: Resetting Active Carts ---');
        yield model_2.default.deleteMany({});
        console.log('  * Active carts cleared.');
        // Step 4: Seed Authentic Apple Products
        console.log('\n--- Step 3: Seeding Authentic Apple Products ---');
        yield (0, seed_apple_products_1.seedAppleProducts)();
        // Step 5: Seed Historical Orders & Invoices across 2026
        console.log('\n--- Step 4: Seeding Historical & Daily Orders ---');
        yield (0, auto_generate_orders_1.seedHistoricalOrders)();
        // Step 6: Final Verification & Statistics
        console.log('\n======================================================');
        console.log('                 FINAL DATA SUMMARY                   ');
        console.log('======================================================');
        const catCount = yield model_6.default.countDocuments();
        const prodCount = yield model_3.default.countDocuments();
        const userCount = yield model_1.default.countDocuments();
        const orderCount = yield model_4.default.countDocuments();
        const invoiceCount = yield model_5.default.countDocuments();
        const completedOrders = yield model_4.default.countDocuments({ status_payment: 'completed' });
        const pendingOrders = yield model_4.default.countDocuments({ status_payment: 'pending' });
        const cancelledOrders = yield model_4.default.countDocuments({ status_payment: 'cancelled' });
        console.log(`Categories   : ${catCount} categories`);
        console.log(`Products     : ${prodCount} authentic Apple products`);
        console.log(`Users        : ${userCount} registered users`);
        console.log(`Total Orders : ${orderCount} orders`);
        console.log(`  - Completed: ${completedOrders}`);
        console.log(`  - Pending  : ${pendingOrders}`);
        console.log(`  - Cancelled: ${cancelledOrders}`);
        console.log(`Invoices     : ${invoiceCount} invoices`);
        console.log('======================================================\n');
        yield mongoose_1.default.disconnect();
        console.log('Database connection closed. Seeding finished successfully!');
    });
}
resetAndSeedAll().catch((err) => {
    console.error('Fatal error during reset and seed:', err);
    process.exit(1);
});
