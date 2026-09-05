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
const model_1 = __importDefault(require("../app/vouchers/model"));
dotenv_1.default.config();
const sampleVouchers = [
    {
        code: 'CYBER20',
        title: 'Diskon 20% Gadget Apple',
        discountType: 'percentage',
        discountValue: 20,
        minPurchase: 5000000,
        maxDiscount: 2000000,
        isPublic: true,
        isActive: true,
        validUntil: new Date('2027-12-31T23:59:59.000Z'),
        usageLimit: 100,
        usedCount: 0,
    },
    {
        code: 'APPLEFEST',
        title: 'Potongan Spesial Rp 500.000',
        discountType: 'fixed',
        discountValue: 500000,
        minPurchase: 10000000,
        maxDiscount: 0,
        isPublic: true,
        isActive: true,
        validUntil: new Date('2027-12-31T23:59:59.000Z'),
        usageLimit: 50,
        usedCount: 0,
    },
    {
        code: 'IGSECRET50',
        title: 'Promo Eksklusif Feed IG 50%',
        discountType: 'percentage',
        discountValue: 50,
        minPurchase: 3000000,
        maxDiscount: 1500000,
        isPublic: false, // Private sosmed exclusive!
        isActive: true,
        validUntil: new Date('2027-12-31T23:59:59.000Z'),
        usageLimit: 20,
        usedCount: 0,
    },
    {
        code: 'TIKTOKDEAL',
        title: 'Flash Deal TikTok Community Rp 750.000',
        discountType: 'fixed',
        discountValue: 750000,
        minPurchase: 8000000,
        maxDiscount: 0,
        isPublic: false, // Private sosmed exclusive!
        isActive: true,
        validUntil: new Date('2027-12-31T23:59:59.000Z'),
        usageLimit: 30,
        usedCount: 0,
    },
];
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
        yield mongoose_1.default.connect(dbUri);
        console.log('Connected to MongoDB.');
        for (const v of sampleVouchers) {
            yield model_1.default.findOneAndUpdate({ code: v.code }, v, { upsert: true, new: true });
            console.log(`Seeded voucher: ${v.code} (isPublic: ${v.isPublic})`);
        }
        console.log('Voucher seeding complete.');
        yield mongoose_1.default.disconnect();
        process.exit(0);
    });
}
seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
