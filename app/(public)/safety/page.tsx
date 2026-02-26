import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Activity, Globe } from "lucide-react";

export default function SafetyPage() {
  return (
    <main className="liba-page-shell animate-in min-h-screen bg-white pb-24">
      <section className="relative overflow-hidden px-6 pb-20 pt-24">
        <div className="pointer-events-none absolute right-8 top-10 text-[10rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[18rem]">
          SAFETY
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-[2px] w-12 bg-red-700" />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-red-700">Biosecurity Focus</span>
          </div>
          <h1 className="mb-8 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[9rem]">
            Disease Risk <br /> <span className="text-red-700">Reduction.</span>
          </h1>
          <p className="max-w-4xl border-l-8 border-red-700 pl-6 text-xl font-black uppercase italic leading-tight tracking-tight text-stone-800 md:text-3xl">
            We are using online auctions to help limit livestock movement and reduce the spread of bek-en-klouseer
            (foot-and-mouth disease) in South Africa.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="rounded-[3rem] border border-red-100 bg-red-50 p-10 shadow-sm">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-700 text-white">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
                Why It Matters.
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-stone-700 md:text-xl">
                Bek-en-klouseer can spread quickly when animals are moved between areas. By running more sales online,
                we help reduce unnecessary transport and large physical gatherings, which supports better farm-level
                biosecurity.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <Activity className="h-6 w-6 text-red-700" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-red-700">Controlled Movement</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-stone-600">
                  Fewer unnecessary animal movements between farms and venues.
                </p>
              </article>
              <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <Globe className="h-6 w-6 text-red-700" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.26em] text-red-700">Digital Access</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-stone-600">
                  Buyers can participate remotely while sellers still reach a strong market.
                </p>
              </article>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[3rem] border border-stone-200 bg-white p-5 shadow-2xl">
            <div className="relative h-full min-h-[520px] overflow-hidden rounded-[2.3rem]">
              <Image
                src="/liba/hero-farm.jpg"
                alt="Livestock biosecurity awareness"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/25 bg-stone-900/60 p-6 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Commitment</p>
                <p className="mt-3 text-lg font-bold italic leading-relaxed text-white">
                  Every online auction is part of a wider effort to keep trade active while supporting safer livestock
                  movement decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[2.5rem] border border-stone-200 bg-white p-10 shadow-sm md:flex-row md:items-center md:justify-between md:p-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Take Part Safely</p>
            <h3 className="mt-3 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
              Join Online Auctions.
            </h3>
          </div>
          <Link
            href="/auctions/live"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3 text-xs font-black uppercase tracking-[0.28em] text-white transition hover:bg-stone-900"
          >
            Open Live Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
