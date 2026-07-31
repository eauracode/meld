// Creates the rider's actual login (Supabase Auth Admin API — invite email)
// and the riders/profiles rows + wallet accounts, then marks the
// application approved. This is why rider approval can't be a plain SQL
// function like approve_merchant() — only Edge Functions can call the Auth
// Admin API (08_APP_FLOWS §2). NOTE: invite email delivery depends on
// Supabase Auth's configured SMTP — not yet exercised live (Phase 6).
import { serviceClient, jsonResponse, handled } from "../_shared/supabase-client.ts";
import { requireCaller, HttpError } from "../_shared/caller.ts";

Deno.serve((req) =>
  handled(async () => {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { applicationId, email } = await req.json();
    if (!applicationId || !email) throw new HttpError(400, "applicationId and email are required");

    const caller = await requireCaller(req);
    if (!caller.isOps) throw new HttpError(403, "Only Ops can approve rider applications");

    const service = serviceClient();
    const { data: application } = await service
      .from("rider_applications")
      .select("*")
      .eq("id", applicationId)
      .single();
    if (!application) throw new HttpError(404, "Application not found");
    if (application.status !== "applied") {
      throw new HttpError(400, `Application is ${application.status}, not applied`);
    }

    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
      data: { role: "rider", full_name: application.full_name },
    });
    if (inviteError || !invited?.user) throw new HttpError(500, `Invite failed: ${inviteError?.message}`);
    const authUserId = invited.user.id;

    const { error: profileError } = await service.from("profiles").insert({
      id: authUserId,
      role: "rider",
      full_name: application.full_name,
      phone: application.phone,
      email,
    });
    if (profileError) throw new HttpError(500, `Profile insert failed: ${profileError.message}`);

    const { data: rider, error: riderError } = await service
      .from("riders")
      .insert({
        profile_id: authUserId,
        application_id: applicationId,
        vehicle: application.vehicle,
        city: application.city,
        state: application.state,
        has_licence: application.has_licence,
        status: "active",
      })
      .select("id")
      .single();
    if (riderError || !rider) throw new HttpError(500, `Rider insert failed: ${riderError?.message}`);

    await service.from("ledger_accounts").insert([
      { type: "rider_wallet", owner_type: "rider", owner_id: rider.id },
      { type: "cash_in_transit", owner_type: "rider", owner_id: rider.id },
    ]);

    await service
      .from("rider_applications")
      .update({ status: "approved", reviewed_by: caller.userId, reviewed_at: new Date().toISOString() })
      .eq("id", applicationId);

    await service.from("audit_log").insert({
      actor_id: caller.userId,
      action: "approve_rider",
      entity_type: "rider",
      entity_id: rider.id,
      detail: { application_id: applicationId, email },
    });

    return jsonResponse({ ok: true, riderId: rider.id });
  }),
);
