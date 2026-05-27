import jwt from "jsonwebtoken";
import type { Response } from "express";

const accessSecret = process.env.JWT_ACCESS_SECRET ?? "change-me-access";
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "change-me-refresh";

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, accessSecret, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, refreshSecret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as { sub: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as { sub: string };
}

export function setAuthCookies(response: Response, userId: string) {
  response.cookie("accessToken", signAccessToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 15 * 60 * 1000
  });
  response.cookie("refreshToken", signRefreshToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie("accessToken");
  response.clearCookie("refreshToken");
}
