import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gavel, Radio } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return (
    <div className="liba-public min-h-screen bg-white text-stone-900">
      <SiteHeader />
      <main className="animate-in">
        <section className="relative h-[74vh] w-full overflow-hidden bg-black">
          <video autoPlay loop muted playsInline className="h-full w-full object-cover">
            <source src="/herovideo.mp4" type="video/mp4" />
          </video>
        </section>

        <section className="relative overflow-hidden bg-white px-6 py-32 text-center">
          <div className="mx-auto max-w-5xl">
            <h2 className="relative text-4xl font-black uppercase italic leading-tight tracking-tighter md:text-7xl">
              <span className="absolute inset-0 text-stone-200/70">
                Liba auctioneers is an auction house in the heart of the Vaalharts
              </span>
              <span className="relative bg-gradient-to-r from-stone-500 via-amber-200 to-stone-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                Liba auctioneers is an auction house in the heart of the Vaalharts
              </span>
            </h2>
            <div className="mt-14 flex items-center justify-center gap-5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
              <span className="text-[11px] font-black uppercase tracking-[0.55em] text-amber-900">Experience Heritage</span>
              <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
            </div>
          </div>
        </section>

        <section className="px-6 pb-32">
          <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-2">
            <Link
              href="/auctions/live"
              className="liba-card-lift group relative overflow-hidden rounded-[3rem] bg-stone-900 p-12 text-left text-white shadow-2xl"
            >
              <div className="relative z-10">
                <Radio className="mb-6 text-red-600" size={40} />
                <h3 className="mb-4 text-5xl font-black uppercase italic tracking-tighter">Bid Live</h3>
                <p className="font-medium text-stone-300">Join the active room and secure your stock.</p>
              </div>
              <div className="absolute bottom-[-10%] right-[-5%] text-[15rem] font-black uppercase italic text-white/[0.04]">
                LIVE
              </div>
            </Link>
            <Link
              href="/auctions"
              className="liba-card-lift group relative overflow-hidden rounded-[3rem] border-2 border-stone-100 bg-white p-12 text-left text-stone-900 shadow-sm"
            >
              <div className="relative z-10">
                <Gavel className="mb-6 text-amber-700" size={40} />
                <h3 className="mb-4 text-5xl font-black uppercase italic tracking-tighter">Auctions</h3>
                <p className="font-medium text-stone-500">Explore the hub and our hybrid trade model.</p>
              </div>
              <div className="absolute bottom-[-10%] right-[-5%] text-[15rem] font-black uppercase italic text-stone-900/[0.03]">
                HUB
              </div>
            </Link>
          </div>

          <section className="mx-auto mt-20 w-full max-w-7xl">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-[2px] w-12 bg-red-700" />
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Livestock Sections</p>
            </div>
            <div className="space-y-12">
              {[
                {
                  title: "Goats",
                  tag: "Boer / Dairy",
                  image: "/pexels-vera-hrishka-782796-3193155.jpg",
                  imageAlt: "Goat livestock",
                  imageClass: "object-[center_58%]",
                  description:
                    "We sell quality Boer and dairy goats from trusted farms, with strong genetics and auction-ready condition for serious buyers.",
                },
                {
                  title: "Cattle",
                  tag: "Beef / Stud",
                  image: "/pexels-matthiaszomer-422218.jpg",
                  imageAlt: "Cattle livestock",
                  imageClass: "",
                  description:
                    "We sell premium beef and stud cattle selected for performance, growth, and proven value in both commercial and breeding programs.",
                },
                {
                  title: "Sheep",
                  tag: "Dorper / Merino",
                  image: "/pexels-peterfazekas-880870.jpg",
                  imageAlt: "Sheep livestock",
                  imageClass: "",
                  description:
                    "We sell top sheep lots including Dorper and Merino lines, managed to high standards and prepared for reliable trade outcomes.",
                },
              ].map((section, index) => (
                <article
                  key={section.title}
                  className="group overflow-hidden rounded-[3.25rem] border border-stone-200 bg-white shadow-[0_34px_80px_-34px_rgba(0,0,0,0.5)]"
                >
                  <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-12 lg:gap-12">
                    <div className={`lg:col-span-7 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                      <div className="relative h-[380px] overflow-hidden rounded-[2.2rem] border-[4px] border-dashed border-stone-300 bg-stone-50 md:h-[520px] lg:h-[600px]">
                        <Image
                          src={section.image}
                          alt={section.imageAlt}
                          fill
                          className={`object-cover transition duration-700 group-hover:scale-105 ${section.imageClass}`}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                        />
                        <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-stone-800 shadow-lg backdrop-blur">
                          {section.title}
                        </div>
                      </div>
                    </div>

                    <div className={`flex flex-col justify-center lg:col-span-5 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                      <span className="w-fit text-[10px] font-black uppercase tracking-[0.35em] text-red-700">
                        {section.tag}
                      </span>
                      <h3 className="mt-4 text-5xl font-black uppercase italic tracking-tighter text-stone-900 md:text-7xl">
                        {section.title}
                        <span className="text-red-700">.</span>
                      </h3>
                      <p className="mt-6 border-l-4 border-red-700 pl-5 text-lg font-medium italic leading-relaxed text-stone-600 md:text-2xl">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mx-auto mt-16 flex w-full max-w-7xl justify-center md:justify-end">
            <Link
              href="/about-us"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.35em] text-red-700 transition hover:text-stone-900"
            >
              Learn About LIBA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
