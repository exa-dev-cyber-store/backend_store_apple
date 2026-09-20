"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseMessaging = getFirebaseMessaging;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
let messagingInstance = null;
let isInitialized = false;
/**
 * Initializes and retrieves the Firebase Admin Messaging instance.
 * Gracefully handles missing credentials without crashing the application.
 */
function getFirebaseMessaging() {
    if (isInitialized) {
        return messagingInstance;
    }
    isInitialized = true;
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        let app = null;
        if (projectId && clientEmail && privateKey) {
            app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            }, 'cyber-apple-store');
            messagingInstance = (0, messaging_1.getMessaging)(app);
            console.log('✅ [FCM] Firebase Admin SDK initialized successfully via env credentials.');
        }
        else if (serviceAccountJson) {
            let cleaned = serviceAccountJson.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            cleaned = cleaned.replace(/\\"/g, '"');
            const serviceAccount = JSON.parse(cleaned);
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
            }, 'cyber-apple-store');
            messagingInstance = (0, messaging_1.getMessaging)(app);
            console.log('✅ [FCM] Firebase Admin SDK initialized successfully via service account JSON.');
        }
        else if ((0, app_1.getApps)().length > 0) {
            messagingInstance = (0, messaging_1.getMessaging)((0, app_1.getApps)()[0]);
            console.log('✅ [FCM] Firebase Admin SDK using existing default app.');
        }
        else {
            console.log('ℹ️ [FCM] Firebase Admin credentials not configured. FCM push dispatch will be bypassed.');
        }
    }
    catch (error) {
        console.warn('⚠️ [FCM] Failed to initialize Firebase Admin SDK:', error.message);
    }
    return messagingInstance;
}
