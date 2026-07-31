import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-lime" aria-hidden />
        <span className="font-heading text-xl font-bold tracking-tight text-ink">MELD Ops</span>
      </div>
      <Card title="Create an Ops account">
        <RegisterForm />
      </Card>
    </div>
  );
}
