import { APP_NAME } from "@/lib/constants/app";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-slate-500">POPIA-friendly placeholder policy content.</p>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-950">
        <p>
          {APP_NAME} processes personal data for account management, user approvals, bidding integrity, and fraud prevention.
        </p>
        <p>
          Data is stored securely and access is controlled through role-based permissions and audit logging. Users may request
          account data updates through profile settings.
        </p>
      </div>
    </main>
  );
}
