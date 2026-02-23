import { APP_NAME } from "@/lib/constants/app";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black uppercase italic tracking-tight text-stone-900">Privacy Policy</h1>
      <p className="text-sm text-stone-500">POPIA-aligned privacy summary for account users.</p>
      <section className="space-y-4 rounded-[2rem] border border-stone-200 bg-white p-7 text-sm leading-relaxed text-stone-700 shadow-sm">
        <p>
          {APP_NAME} processes account and auction data for user approvals, bid integrity, notifications, fraud
          prevention, and legal compliance.
        </p>
        <p>
          Access is controlled by role-based permissions with audit logs. Users may request profile updates through
          account settings.
        </p>
      </section>
    </main>
  );
}
