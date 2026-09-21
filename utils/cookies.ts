import { Response, CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Returns standard cookie options for authentication cookies.
 * Refresh token is strictly httpOnly to prevent XSS.
 * Access token can be read by clients or passed via credentials.
 */
export const getAuthCookieOptions = (isHttpOnly: boolean = true, maxAgeMs?: number): CookieOptions => {
  const options: CookieOptions = {
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

/**
 * Sets auth cookies on Express Response:
 * - refreshToken: httpOnly = true (30 days)
 * - accessToken & token: httpOnly = false for client session awareness (15 minutes)
 */
export const setAuthCookies = (res: Response, accessToken: string, refreshToken?: string): void => {
  // 30 days for refresh token (strictly httpOnly)
  if (refreshToken) {
    const refreshOptions = getAuthCookieOptions(true, 30 * 24 * 60 * 60 * 1000);
    res.cookie('refreshToken', refreshToken, refreshOptions);
  }

  // 15 minutes for access token
  const accessOptions = getAuthCookieOptions(false, 15 * 60 * 1000);
  res.cookie('accessToken', accessToken, accessOptions);
  res.cookie('token', accessToken, accessOptions);
};

/**
 * Clears all auth cookies on logout
 */
export const clearAuthCookies = (res: Response): void => {
  const clearOptions = getAuthCookieOptions(true);
  delete clearOptions.maxAge;

  res.clearCookie('refreshToken', clearOptions);
  res.clearCookie('accessToken', { ...clearOptions, httpOnly: false });
  res.clearCookie('token', { ...clearOptions, httpOnly: false });
  res.clearCookie('jwt', clearOptions);
};
