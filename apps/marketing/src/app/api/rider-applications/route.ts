import { NextResponse } from "next/server";
import { riderApplicationSchema } from "@/lib/schemas";

function apiBase(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3090/api").replace(/\/$/, "");
}

/** Rider application intake (02_PRD_Marketing FR-3). Public — proxies to the live API's public POST /riders/applications. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = riderApplicationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const res = await fetch(`${apiBase()}/riders/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.data),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errBody.message ?? "Could not submit the application" }, { status: res.status });
  }
  const record = (await res.json()) as { id: string };
  return NextResponse.json({ id: record.id }, { status: 201 });
}
