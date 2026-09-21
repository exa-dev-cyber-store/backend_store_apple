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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectedView = exports.getToken = void 0;
exports.isValidEmail = isValidEmail;
const date_fns_1 = require("date-fns");
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
__exportStar(require("./cookies"), exports);
const getToken = (req) => {
    var _a, _b, _c;
    if (req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
        }
    }
    return ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken) || ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.token) || ((_c = req.cookies) === null || _c === void 0 ? void 0 : _c.jwt) || null;
};
exports.getToken = getToken;
const getSelectedView = (periode) => {
    const lastPeriode = (() => {
        let start, end;
        switch (periode) {
            case 'Day': {
                start = (0, date_fns_1.startOfDay)((0, date_fns_1.sub)(new Date(), { days: 1 }));
                end = (0, date_fns_1.endOfDay)((0, date_fns_1.sub)(new Date(), { days: 1 }));
                return { start, end };
            }
            case 'Month': {
                start = (0, date_fns_1.startOfMonth)((0, date_fns_1.sub)(new Date(), { months: 1 }));
                end = (0, date_fns_1.endOfMonth)((0, date_fns_1.sub)(new Date(), { months: 1 }));
                return { start, end };
            }
            case 'Year': {
                start = (0, date_fns_1.startOfYear)((0, date_fns_1.sub)(new Date(), { years: 1 }));
                end = (0, date_fns_1.endOfYear)((0, date_fns_1.sub)(new Date(), { years: 1 }));
                return { start, end };
            }
            case 'Week': {
                start = (0, date_fns_1.startOfWeek)((0, date_fns_1.sub)(new Date(), { weeks: 1 }));
                end = (0, date_fns_1.endOfWeek)((0, date_fns_1.sub)(new Date(), { weeks: 1 }));
                return { start, end };
            }
        }
        return { start, end };
    });
    const currentPeriode = (() => {
        let start, end;
        switch (periode) {
            case 'Day': {
                start = (0, date_fns_1.startOfDay)(new Date());
                end = (0, date_fns_1.endOfDay)(new Date());
                return { start, end };
            }
            case 'Month': {
                start = (0, date_fns_1.startOfMonth)(new Date());
                end = (0, date_fns_1.endOfMonth)(new Date());
                return { start, end };
            }
            case 'Year': {
                start = (0, date_fns_1.startOfYear)(new Date());
                end = (0, date_fns_1.endOfYear)(new Date());
                return { start, end };
            }
            case 'Week': {
                start = (0, date_fns_1.startOfWeek)(new Date());
                end = (0, date_fns_1.endOfWeek)(new Date());
                return { start, end };
            }
        }
        return { start, end };
    });
    return { lastPeriode, currentPeriode };
};
exports.getSelectedView = getSelectedView;
