import { Card } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime" aria-hidden />
        <span className="font-heading text-lg font-bold tracking-tight text-ink">MELD Rider</span>
      </div>
      <Card title="Set a new password">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
