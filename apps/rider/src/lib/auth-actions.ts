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

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  try {
    const { accessToken } = await apiPost<TokenResponse>("/auth/login", { email, password }, { skipAuthRedirect: true });
    const jar = await cookies();
    jar.set(TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
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
