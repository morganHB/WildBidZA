import { Mail, MapPin, PhoneCall, User } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="liba-page-shell animate-in min-h-screen bg-white pb-24 pt-20">
      <section className="relative overflow-hidden px-6 pb-12 pt-20">
        <div className="pointer-events-none absolute right-4 top-10 text-[11rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[18rem]">
          CONNECT
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-[2px] w-12 bg-red-700" />
            <span className="text-xs font-black uppercase tracking-[0.35em] text-red-700">Access Points</span>
          </div>
          <h1 className="mb-8 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[9rem]">
            Liba <br /> <span className="text-red-700">Direct.</span>
          </h1>
          <p className="max-w-4xl text-2xl font-black uppercase italic leading-tight tracking-tight text-stone-800 md:text-4xl">
            Want to buy or sell livestock?
            <br />
            <span className="text-red-700">Our desk is open.</span>
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-4">
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[3rem] bg-stone-900 p-10 text-white shadow-2xl">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-red-700/25 blur-3xl" />
              <div>
                <p className="mb-10 text-[11px] font-black uppercase tracking-[0.35em] text-amber-400">Team Leadership</p>
                <div className="space-y-10">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <User className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Jaco</h3>
                      <a
                        href="tel:0828193380"
                        className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400 transition hover:text-amber-400"
                      >
                        082 819 3380
                      </a>
                    </div>
                    <PhoneCall className="ml-auto h-5 w-5 text-white/20" />
                  </div>
                  <div className="h-px w-full bg-white/10" />
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <User className="h-6 w-6 text-white/50" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Carlie</h3>
                      <a
                        href="tel:0724320860"
                        className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400 transition hover:text-amber-400"
                      >
                        072 432 0860
                      </a>
                    </div>
                    <PhoneCall className="ml-auto h-5 w-5 text-white/20" />
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-3 border-t border-white/10 pt-6 text-xs font-bold uppercase tracking-[0.22em] text-stone-300">
                <p className="inline-flex items-center gap-3">
                  <Mail className="h-4 w-4 text-amber-400" />
                  <a href="mailto:sales@liba.co.za" className="transition hover:text-amber-400">
                    sales@liba.co.za
                  </a>
                </p>
                <p className="inline-flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-amber-400" />
                  100 DF Malan Street, Hartswater
                </p>
              </div>
            </div>
          </aside>

          <div className="relative min-h-[500px] overflow-hidden rounded-[4rem] border border-stone-200 bg-white p-5 shadow-2xl lg:col-span-8">
            <div className="absolute inset-5 overflow-hidden rounded-[3.2rem] bg-stone-200">
              <iframe
                title="LIBA location map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3545.4190184478144!2d24.8080!3d-27.7500!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDQ1JzAwLjAiUyAyNMKwNDgnMjguOCJF!5e0!3m2!1sen!2sza!4v1614000000000!5m2!1sen!2sza"
                className="h-full w-full border-0 grayscale transition duration-1000 hover:grayscale-0"
                loading="lazy"
                allowFullScreen
              />
              <div className="pointer-events-none absolute bottom-8 left-8 right-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="pointer-events-auto rounded-3xl border border-white/10 bg-stone-900/95 p-7 shadow-2xl backdrop-blur">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Coordinates Locked</p>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                    100 DF Malan Street
                    <br />
                    Hartswater, 8570
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
