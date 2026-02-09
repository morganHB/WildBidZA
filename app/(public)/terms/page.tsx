import { APP_NAME } from "@/lib/constants/app";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Terms & Conditions</h1>
      <p className="text-sm text-slate-500">Placeholder policy content for {APP_NAME}.</p>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-950">
        <p>
          By using {APP_NAME}, users agree to platform terms, bidding obligations, and seller compliance responsibilities.
          Specific legal terms must be reviewed and approved with local counsel.
        </p>
        <p>
          Sellers are responsible for permits and lawful transfer requirements for each listed animal. Buyers are responsible
          for payment, collection arrangements, and any required permits.
        </p>
      </div>
    </main>
  );
}
