"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiPost } from "./api";
import { TOKEN_COOKIE } from "./constants";

export interface AuthResult {
  error: string | null;
}

interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
}

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  let mustChangePassword = false;
  try {
    const res = await apiPost<LoginResponse>("/auth/login", { email, password }, { skipAuthRedirect: true });
    mustChangePassword = res.mustChangePassword;
    const jar = await cookies();
    jar.set(TOKEN_COOKIE, res.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach the server. Try again." };
  }
  // Fast path straight to the change-password screen. The (app)/layout.tsx
  // check is the real enforcement backstop — this redirect just avoids a
  // redundant round-trip through "/" first.
  redirect(mustChangePassword ? "/change-password" : "/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  redirect("/login");
}

export interface ChangePasswordResult {
  error: string | null;
}

export async function changePassword(_prev: ChangePasswordResult, formData: FormData): Promise<ChangePasswordResult> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) return { error: "Current and new password are required." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New password and confirmation do not match." };
  if (newPassword === currentPassword) {
    return { error: "New password must be different from your current password." };
  }

  try {
    await apiPost("/auth/change-password", { currentPassword, newPassword });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not change your password. Try again." };
  }
  redirect("/");
}
