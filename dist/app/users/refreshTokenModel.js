"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const refreshTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedByToken: { type: String },
    userAgent: { type: String },
    ip: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("RefreshToken", refreshTokenSchema);
