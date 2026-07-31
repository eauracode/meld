import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime" aria-hidden />
        <span className="font-heading text-lg font-bold tracking-tight text-ink">MELD Merchant</span>
      </div>
      <Card title="Sign in">
        <LoginForm />
      </Card>
    </div>
  );
}
