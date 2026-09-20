import { model, Schema, Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
    userId: Types.ObjectId | string;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    revokedAt?: Date;
    replacedByToken?: string;
    userAgent?: string;
    ip?: string;
    createdAt: Date;
    updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        token: { type: String, required: true, unique: true, index: true },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
        revoked: { type: Boolean, default: false },
        revokedAt: { type: Date },
        replacedByToken: { type: String },
        userAgent: { type: String },
        ip: { type: String },
    },
    { timestamps: true }
);

export default model<IRefreshToken>("RefreshToken", refreshTokenSchema);
