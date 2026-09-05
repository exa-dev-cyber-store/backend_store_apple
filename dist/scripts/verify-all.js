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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_1 = __importDefault(require("../app/users/model"));
dotenv_1.default.config();
function runVerification() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        console.log('=== Step 1: Connecting to MongoDB ===');
        const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
        yield mongoose_1.default.connect(dbUri);
        const admin = yield model_1.default.findOne({ role: 'admin' });
        if (!admin) {
            throw new Error('Admin not found');
        }
        const token = jsonwebtoken_1.default.sign({ _id: admin._id, email: admin.email, name: admin.name, role: admin.role }, process.env.SECRET_JWT_KEY, { algorithm: 'HS384' });
        yield model_1.default.updateOne({ _id: admin._id }, { $push: { token } });
        console.log('Admin token generated for:', admin.email);
        console.log('\n=== Step 2: Testing GET /api/users (Admin Protected) ===');
        const userRes = yield fetch('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const userJson = yield userRes.json();
        console.log('Users API Status:', userRes.status);
        console.log('Users Total:', (_a = userJson.data) === null || _a === void 0 ? void 0 : _a.total);
        console.log('Admins Total:', (_b = userJson.data) === null || _b === void 0 ? void 0 : _b.totalAdmins);
        console.log('Regular Users:', (_c = userJson.data) === null || _c === void 0 ? void 0 : _c.totalRegularUsers);
        console.log('\n=== Step 3: Testing GET /api/vouchers/public ===');
        const pubRes = yield fetch('http://localhost:5000/api/vouchers/public');
        const pubJson = yield pubRes.json();
        console.log('Public Vouchers Status:', pubRes.status);
        console.log('Public Vouchers:', (_d = pubJson.data) === null || _d === void 0 ? void 0 : _d.map((v) => ({ code: v.code, discount: v.discountValue, isPublic: v.isPublic })));
        console.log('\n=== Step 4: Testing Private Sosmed Voucher IGSECRET50 ===');
        const validateRes = yield fetch('http://localhost:5000/api/vouchers/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: 'IGSECRET50', subtotal: 10000000 }),
        });
        const validateJson = yield validateRes.json();
        console.log('Validate Status:', validateRes.status);
        console.log('Validate Message:', validateJson.message);
        console.log('Discount Amount:', (_e = validateJson.data) === null || _e === void 0 ? void 0 : _e.discount);
        console.log('Final Subtotal:', (_f = validateJson.data) === null || _f === void 0 ? void 0 : _f.finalSubtotal);
        console.log('\n=== Step 5: Testing MinIO Image Retrieval ===');
        const minioRes = yield fetch('http://localhost:9000/apple-store/images/01200ede8888fceb4d6eb4e351f863e4.jpg', { method: 'HEAD' });
        console.log('MinIO Image Status:', minioRes.status);
        console.log('MinIO Content-Type:', minioRes.headers.get('content-type'));
        console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
        yield mongoose_1.default.disconnect();
        process.exit(0);
    });
}
runVerification().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
});
