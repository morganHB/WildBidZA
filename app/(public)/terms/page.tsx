import { APP_NAME } from "@/lib/constants/app";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black uppercase italic tracking-tight text-stone-900">Terms & Conditions</h1>
      <p className="text-sm text-stone-500">Core terms for participation on {APP_NAME}.</p>
      <section className="space-y-4 rounded-[2rem] border border-stone-200 bg-white p-7 text-sm leading-relaxed text-stone-700 shadow-sm">
        <p>
          By using {APP_NAME}, users agree to bidding obligations, listing integrity requirements, and platform
          compliance controls.
        </p>
        <p>
          Sellers are responsible for permits and lawful transfer requirements. Buyers are responsible for payment,
          collection coordination, and statutory documentation.
        </p>
      </section>
    </main>
  );
}
