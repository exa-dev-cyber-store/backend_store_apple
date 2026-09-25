"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const router_1 = __importDefault(require("./app/categories/router"));
const router_2 = __importDefault(require("./app/products/router"));
const router_3 = __importDefault(require("./app/users/router"));
const router_4 = __importDefault(require("./app/cart/router"));
const router_5 = __importDefault(require("./app/likes/router"));
const router_6 = __importDefault(require("./app/orders/router"));
const router_7 = __importDefault(require("./app/invoices/router"));
const router_8 = __importDefault(require("./app/deliveryAddress/router"));
const router_9 = __importDefault(require("./app/dashboard/router"));
const router_10 = __importDefault(require("./app/vouchers/router"));
const router_11 = __importDefault(require("./app/notifications/router"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // Allow public image assets to be loaded by frontends
}));
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
// Request parsing & static assets
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, '/public')));
// Root & Health check
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Apple Store API',
        data: {
            app: 'Apple Store Backend',
            status: 'running',
            time: new Date().toISOString(),
        },
        code: 'SUCCESS',
    });
});
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Health check completed',
        data: {
            status: 'healthy',
            time: new Date().toISOString(),
        },
        code: 'SUCCESS',
    });
});
// Feature routes
app.use('/api', router_1.default);
app.use('/api', router_2.default);
app.use('/api', router_4.default);
app.use('/api', router_5.default);
app.use('/api', router_6.default);
app.use('/api', router_7.default);
app.use('/api', router_8.default);
app.use('/api', router_9.default);
app.use('/api', router_3.default);
app.use('/api', router_10.default);
app.use('/api', router_11.default);
app.use('/auth', router_3.default);
// Browser GET redirects to Frontend Web UI
app.get(['/forgot-password', '/reset-password', '/login', '/register', '/verify-email'], (req, res) => {
    const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`${clientUrl}${req.path}${queryString}`);
});
// 404 Not Found Handler
app.use(errorHandler_1.default.notFound);
// Global Centralized Error Handler
app.use(errorHandler_1.default.middleware);
exports.default = app;
