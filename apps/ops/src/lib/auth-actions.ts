"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiPost } from "./api";
import { TOKEN_COOKIE } from "./constants";

export interface AuthResult {
  error: string | null;
}

interface TokenResponse {
  accessToken: string;
}

async function setSession(accessToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  try {
    const { accessToken } = await apiPost<TokenResponse>("/auth/login", { email, password }, { skipAuthRedirect: true });
    await setSession(accessToken);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach the server. Try again." };
  }
  redirect("/");
}

/** Self-serve ops signup is a v1 simplification (no real staff-invite flow exists yet — see AuthService.register). */
export async function register(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = formData.get("role") === "ops_admin" ? "ops_admin" : "ops_agent";
  if (!email || !password || !fullName) {
    return { error: "Name, email and password are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const { accessToken } = await apiPost<TokenResponse>(
      "/auth/register",
      { email, password, fullName, role },
      { skipAuthRedirect: true },
    );
    await setSession(accessToken);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach the server. Try again." };
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  redirect("/login");
}
