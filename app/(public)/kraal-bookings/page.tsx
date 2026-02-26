import Link from "next/link";
import { ArrowRight, Clock, Globe, MapPin, Send } from "lucide-react";

export default function KraalBookingsPage() {
  return (
    <main className="liba-page-shell animate-in bg-white pb-24 pt-20">
      <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-[11rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[18rem]">
          KRAAL
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.45em] text-red-700">Logistics</p>
          <h1 className="mb-10 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[9rem]">
            Kraal <span className="text-red-700">Bookings.</span>
          </h1>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-[2rem] bg-stone-900 p-8 text-white shadow-2xl md:flex-row">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-700">
              <Clock className="h-8 w-8" />
            </div>
            <p className="text-left text-lg font-bold tracking-tight md:text-2xl">
              Please note you need to book a kraal <span className="font-black text-amber-400">48 hours in advance</span>
              {" "}
              prior to bringing your animals to the auction.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-3">
          <article className="liba-card-lift rounded-[3rem] border border-stone-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="mb-4 text-2xl font-black uppercase italic">Print & Send</h2>
            <p className="mb-8 text-stone-500">Whatsapp your completed form directly to our team.</p>
            <a
              href="https://wa.me/27662505253"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-red-700"
            >
              066 250 5253 <ArrowRight className="h-4 w-4" />
            </a>
          </article>

          <article className="liba-card-lift rounded-[3rem] border border-stone-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="mb-4 text-2xl font-black uppercase italic">In Person</h2>
            <p className="mb-8 text-stone-500">Collect the form at our local office in Hartswater.</p>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-900">
              100 DF Malan Street, Hartswater
            </p>
          </article>

          <article className="liba-card-lift rounded-[3rem] border border-stone-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
              <Globe className="h-6 w-6" />
            </div>
            <h2 className="mb-4 text-2xl font-black uppercase italic">Online Portal</h2>
            <p className="mb-8 text-stone-500">Fill in the digital booking form on our dedicated partner portal.</p>
            <a
              href="https://www.kraal2kraal.co.za"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-red-700"
            >
              KRAAL2KRAAL.CO.ZA <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        </div>

        <div className="mx-auto mt-12 w-full max-w-7xl text-center md:text-right">
          <Link
            href="/liba/kraal-booking-form.pdf"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-red-700"
            target="_blank"
          >
            Download Booking Form <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
