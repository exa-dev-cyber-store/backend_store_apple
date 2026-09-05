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
exports.checkIsUserData = exports.checkRole = exports.decodeToken = void 0;
const auth_1 = require("./auth");
__exportStar(require("./auth"), exports);
__exportStar(require("./errorHandler"), exports);
// Backwards compatibility aliases
const decodeToken = () => auth_1.optionalAuth;
exports.decodeToken = decodeToken;
const checkRole = (role) => (0, auth_1.authorize)(role);
exports.checkRole = checkRole;
const checkIsUserData = (idField = '_id') => (0, auth_1.checkOwnership)(idField);
exports.checkIsUserData = checkIsUserData;
