import { model, Schema, Document, Types } from "mongoose";




export interface User extends Document {
    name: string;
    _id: Types.ObjectId | string;
    email: string;
    password?: string;
    role: string;
    token?: string[];
    likes?: string[];
    createdAt: Date;
    cart?: Types.ObjectId | string;
    updatedAt: Date;
    // Auth & Account Linking fields
    signupProvider?: 'apple' | 'google' | 'local';
    googleId?: string;
    googleEmail?: string;
    appleId?: string;
    appleEmail?: string;
    authProviders?: string[];
    // Password reset fields
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    resetPasswordAttempts?: number;
    resetPasswordWindowStart?: Date;
    // Profile picture avatar
    avatar?: string;
    // Apple Server-to-Server notification status
    appleConsentRevoked?: boolean;
    appleConsentRevokedAt?: Date;
    emailRelayDisabled?: boolean;
}

// Remove the line that references 'THydratedDocumentType'


const userSchema = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, default: 'user' },
    avatar: { type: String, default: null },
    token: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    cart: { type: Schema.Types.ObjectId, ref: 'Cart' },
    signupProvider: { type: String, enum: ['apple', 'google', 'local'], default: 'local' },
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

export default model<User>('User', userSchema);

