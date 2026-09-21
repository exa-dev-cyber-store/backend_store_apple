"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAuthCookies = exports.setAuthCookies = exports.getAuthCookieOptions = void 0;
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Returns standard cookie options for authentication cookies.
 * Refresh token is strictly httpOnly to prevent XSS.
 * Access token can be read by clients or passed via credentials.
 */
const getAuthCookieOptions = (isHttpOnly = true, maxAgeMs) => {
    const options = {
        httpOnly: isHttpOnly,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    };
    if (maxAgeMs !== undefined) {
        options.maxAge = maxAgeMs;
    }
    if (process.env.COOKIE_DOMAIN) {
        options.domain = process.env.COOKIE_DOMAIN;
    }
    return options;
};
exports.getAuthCookieOptions = getAuthCookieOptions;
/**
 * Sets auth cookies on Express Response:
 * - refreshToken: httpOnly = true (30 days)
 * - accessToken & token: httpOnly = false for client session awareness (15 minutes)
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    // 30 days for refresh token (strictly httpOnly)
    if (refreshToken) {
        const refreshOptions = (0, exports.getAuthCookieOptions)(true, 30 * 24 * 60 * 60 * 1000);
        res.cookie('refreshToken', refreshToken, refreshOptions);
    }
    // 15 minutes for access token
    const accessOptions = (0, exports.getAuthCookieOptions)(false, 15 * 60 * 1000);
    res.cookie('accessToken', accessToken, accessOptions);
    res.cookie('token', accessToken, accessOptions);
};
exports.setAuthCookies = setAuthCookies;
/**
 * Clears all auth cookies on logout
 */
const clearAuthCookies = (res) => {
    const clearOptions = (0, exports.getAuthCookieOptions)(true);
    delete clearOptions.maxAge;
    res.clearCookie('refreshToken', clearOptions);
    res.clearCookie('accessToken', Object.assign(Object.assign({}, clearOptions), { httpOnly: false }));
    res.clearCookie('token', Object.assign(Object.assign({}, clearOptions), { httpOnly: false }));
    res.clearCookie('jwt', clearOptions);
};
exports.clearAuthCookies = clearAuthCookies;
