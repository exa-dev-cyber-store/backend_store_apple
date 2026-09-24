"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Remove the line that references 'THydratedDocumentType'
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, default: 'user' },
    avatar: { type: String, default: null },
    token: [{ type: String }],
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    cart: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Cart' },
    signupProvider: { type: String, enum: ['apple', 'google', 'local'], default: 'local' },
    hasCustomPassword: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String },
    emailVerificationExpires: { type: Date },
    emailVerificationSentAt: { type: Date },
    googleId: { type: String, sparse: true, index: true },
    googleEmail: { type: String },
    appleId: { type: String, sparse: true, index: true },
    appleEmail: { type: String },
    authProviders: [{ type: String }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordAttempts: { type: Number, default: 0 },
    resetPasswordWindowStart: { type: Date },
    appleConsentRevoked: { type: Boolean, default: false },
    appleConsentRevokedAt: { type: Date },
    emailRelayDisabled: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('User', userSchema);
