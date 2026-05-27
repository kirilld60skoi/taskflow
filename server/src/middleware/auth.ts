import type { NextFunction, Request, Response } from "express";
import { setAuthCookies, verifyAccessToken, verifyRefreshToken } from "../lib/auth";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const accessToken = request.cookies.accessToken as string | undefined;
  const refreshToken = request.cookies.refreshToken as string | undefined;

  try {
    if (accessToken) {
      request.userId = verifyAccessToken(accessToken).sub;
      return next();
    }
  } catch {
    // fall through to refresh token recovery
  }

  try {
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      request.userId = payload.sub;
      setAuthCookies(response, payload.sub);
      return next();
    }
  } catch {
    // handled below
  }

  response.status(401).json({ message: "Unauthorized" });
}
