import Link from "next/link";
import { buttonVariants } from "@/components/ui";
import { MeldMark } from "@/components/logo";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-5 py-20 text-center">
      <MeldMark className="h-10 w-10" />
      <p className="mt-6 font-heading text-6xl font-bold text-ink">404</p>
      <h1 className="mt-2 font-heading text-xl font-bold text-ink">This page didn&apos;t make it to the warehouse.</h1>
      <p className="mt-2 max-w-sm text-sm text-slate">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className={`${buttonVariants.limeSolid} mt-8`}>
        Back to home
      </Link>
    </section>
  );
}
