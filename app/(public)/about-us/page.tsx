import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartPulse } from "lucide-react";

export default function AboutUsPage() {
  return (
    <main className="liba-page-shell animate-in bg-white pb-24 pt-20">
      <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 text-[11rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[18rem]">
          STORY
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-6 text-xs font-black uppercase tracking-[0.5em] text-red-700">About Liba</p>
          <h1 className="mb-10 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[9rem]">
            Our <span className="text-red-700">Heritage.</span>
          </h1>
          <p className="mx-auto max-w-3xl border-l-8 border-red-700 pl-6 text-left text-xl font-black uppercase italic tracking-tight text-stone-800 md:text-3xl">
            Choose LIBA for your next online marketing opportunity.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <p className="text-lg font-medium leading-relaxed text-stone-600 md:text-xl">
              As we have all come to realize, in recent years, the online auction format has become the most efficient
              and convenient method of selling livestock in today&apos;s climate of rising input costs and travel expenses.
            </p>
            <div className="group relative overflow-hidden rounded-[3rem] border border-red-100 bg-red-50 p-10 shadow-sm">
              <div className="absolute right-0 top-0 p-8 text-red-100 transition-colors group-hover:text-red-200">
                <HeartPulse size={72} strokeWidth={2.5} />
              </div>
              <p className="relative z-10 text-lg font-bold italic leading-relaxed text-red-900">
                Ons veilings speel ook &apos;n deurslaggewende rol om die verspreiding van bek-en-klouseer te voorkom deur
                streng biosekuriteitsmaatreels en &apos;n gereguleerde handelsomgewing te handhaaf.
              </p>
            </div>
            <div className="rounded-[3rem] border border-amber-100 bg-white p-10 shadow-xl">
              <p className="text-lg font-bold italic leading-relaxed text-stone-800">
                We feel that a healthy level of interaction and contact with customers from both sides of the fence
                deserve personal interaction not always provided.
              </p>
            </div>
            <Link
              href="/auctions/live"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.35em] text-red-700 transition hover:text-stone-900"
            >
              Open Live Auctions <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-stone-200 shadow-2xl">
            <Image
              src="/liba/cattle.jpg"
              alt="LIBA heritage"
              fill
              className="object-cover grayscale"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
