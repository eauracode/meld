import { NextResponse } from "next/server";
import { demoRequestSchema } from "@/lib/schemas";

function apiBase(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3090/api").replace(/\/$/, "");
}

/** Demo booking fallback intake (02_PRD_Marketing FR-4). Public — proxies to the live API's public POST /demo-requests. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = demoRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const res = await fetch(`${apiBase()}/demo-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.data),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errBody.message ?? "Could not submit the request" }, { status: res.status });
  }
  const record = (await res.json()) as { id: string };
  return NextResponse.json({ id: record.id }, { status: 201 });
}
