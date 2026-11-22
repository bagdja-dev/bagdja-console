import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Boxes,
  Building2,
  CircleDollarSign,
  Code2,
  Fingerprint,
  KeyRound,
  Layers,
  Lock,
  Plug,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Vault,
  Wallet,
} from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { ArchitectureVisual } from '@/components/landing/ArchitectureVisual';

export const metadata: Metadata = {
  title: 'Bagdja Console: backend siap pakai untuk aplikasimu',
  description:
    'Daftarkan aplikasimu di Bagdja Console dan pakai layanan inti yang siap jalan: login & SSO, wallet, pembayaran, escrow, pencairan dana, event, dan log.',
};

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

interface Pillar {
  tag: string;
  title: string;
  lead: string;
  icon: LucideIcon;
  items: Feature[];
}

const PAINS: Feature[] = [
  {
    icon: Fingerprint,
    title: 'Login yang benar-benar aman',
    body: 'Session, token, verifikasi email, login Google, peran per organisasi. Kecil di demo, besar di produksi.',
  },
  {
    icon: CircleDollarSign,
    title: 'Integrasi payment gateway',
    body: 'Kredensial, signature, webhook, status pembayaran yang telat datang. Satu salah, uang tidak tercatat.',
  },
  {
    icon: Vault,
    title: 'Menahan dan mencairkan dana',
    body: 'Marketplace dan jasa butuh dana ditahan dulu, lalu dilepas ke penjual dan ditarik ke rekening.',
  },
  {
    icon: ScrollText,
    title: 'Jejak dan notifikasi',
    body: 'Event antar sistem, email transaksi, dan log untuk melacak masalah saat ada keluhan pengguna.',
  },
];

const PILLARS: Pillar[] = [
  {
    tag: '01',
    title: 'Identitas',
    lead: 'Satu akun Bagdja untuk penggunamu, satu tempat untuk timmu.',
    icon: KeyRound,
    items: [
      { icon: Fingerprint, title: 'SSO & login', body: 'Email + password dan Google, dengan verifikasi email.' },
      { icon: Building2, title: 'Organisasi & anggota', body: 'Kelola tim dan akses per organisasi.' },
      { icon: Boxes, title: 'Aplikasi klien', body: 'Daftarkan aplikasi, kelola kredensial, lisensi, dan penggunanya.' },
    ],
  },
  {
    tag: '02',
    title: 'Uang',
    lead: 'Satu ledger untuk semua transaksi, tanpa pembukuan ganda.',
    icon: Wallet,
    items: [
      { icon: Wallet, title: 'Wallet & pembayaran', body: 'Wallet organisasi dan personal, top-up, invoice, metode bayar per aplikasi.' },
      { icon: Layers, title: 'Langganan & paket', body: 'Produk, paket, dan tagihan berulang untuk model SaaS.' },
      { icon: Vault, title: 'Escrow & payout', body: 'Tahan dana, lepas sebagian atau penuh, refund, lalu cairkan ke rekening dengan PIN.' },
    ],
  },
  {
    tag: '03',
    title: 'Operasional',
    lead: 'Hal-hal di balik layar yang biasanya dibangun belakangan.',
    icon: Radio,
    items: [
      { icon: Radio, title: 'Event & webhook', body: 'Terima perubahan status lewat webhook atau WebSocket.' },
      { icon: ScrollText, title: 'Email, notifikasi & log', body: 'Template email, notifikasi, dan pencarian log terpusat.' },
      { icon: Truck, title: 'Storage & pengiriman', body: 'Kredensial storage dan ongkos kirim dikelola dari satu panel.' },
    ],
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '1',
    title: 'Buat akun & organisasi',
    body: 'Daftar dengan email atau Google, lalu buat organisasi untuk timmu.',
  },
  {
    n: '2',
    title: 'Daftarkan aplikasimu',
    body: 'Dapatkan kredensial aplikasi. Atur metode bayar, biaya, dan tujuan pencairan dari Console.',
  },
  {
    n: '3',
    title: 'Sambungkan & jalan',
    body: 'Panggil API dengan kredensial aplikasi, dengarkan event lewat webhook. Pakai SDK untuk Node.js/NestJS.',
  },
];

const SECURITY: Feature[] = [
  {
    icon: Lock,
    title: 'PIN di setiap transaksi',
    body: 'Pembayaran dari wallet dan penarikan dana dikonfirmasi PIN pemilik akun.',
  },
  {
    icon: ShieldCheck,
    title: 'OTP untuk hal sensitif',
    body: 'Membuat atau mengatur ulang PIN dan menambah rekening tujuan butuh OTP.',
  },
  {
    icon: KeyRound,
    title: 'Secret tidak pernah ke aplikasimu',
    body: 'Aplikasimu memverifikasi token pengguna lewat kunci publik (JWKS), bukan berbagi secret platform.',
  },
  {
    icon: Users,
    title: 'Dipakai sendiri setiap hari',
    body: 'Website Builder, POS, dan Bookpedia berjalan di atas layanan inti yang sama.',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Apa itu Bagdja Console?',
    a: 'Console adalah tempat kamu mendaftarkan aplikasi dan mengatur layanan inti Bagdja yang dipakainya: identitas, wallet, pembayaran, escrow, pencairan dana, event, email, dan log.',
  },
  {
    q: 'Apakah saya harus memakai semua layanan?',
    a: 'Tidak. Pakai yang kamu butuhkan. Misalnya hanya login & SSO, atau hanya pembayaran dan escrow. Logika bisnis aplikasimu tetap di aplikasimu sendiri.',
  },
  {
    q: 'Bahasa dan framework apa yang didukung?',
    a: 'Layanan diakses lewat HTTP API, jadi bisa dipanggil dari bahasa apa pun. SDK resmi saat ini tersedia untuk Node.js (NestJS): guard kredensial aplikasi dan logger terpusat.',
  },
  {
    q: 'Bisakah aplikasi yang saya bangun dengan AI memakainya?',
    a: 'Bisa. Biarkan asisten AI mengerjakan fitur dan tampilan produkmu, sementara uang dan identitas ditangani layanan yang sudah berjalan di produk nyata.',
  },
  {
    q: 'Berapa biayanya?',
    a: 'Membuat akun tidak dipungut biaya. Biaya transaksi diatur per metode pembayaran dan per aplikasi. Hubungi tim Bagdja untuk skema yang sesuai dengan produkmu.',
  },
];

const SDK_SNIPPET = `import { BagdjaModule } from '@bagdja/node-sdk';

@Module({
  imports: [
    BagdjaModule.register({
      isGlobal: true,
      auth:   { authServiceUrl: process.env.BAGDJA_AUTH_URL },
      logger: { logServiceUrl:  process.env.BAGDJA_LOG_URL,
                serviceName: 'toko-kopi-api' },
    }),
  ],
})
export class AppModule {}`;

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--action-primary)]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {lead && <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{lead}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-root relative min-h-screen overflow-x-clip bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden="true" />
      <div className="landing-glow pointer-events-none absolute left-1/2 top-[-240px] h-[560px] w-[900px] -translate-x-1/2" aria-hidden="true" />

      <LandingNav />

      <main id="top">
        {/* Hero */}
        <section className="relative px-4 pb-16 pt-32 sm:px-6 sm:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-white/[0.03] px-3 py-1 text-xs text-[var(--text-secondary)]">
              <Sparkles size={14} className="text-[var(--action-primary)]" aria-hidden="true" />
              Backend siap pakai untuk aplikasi di Indonesia
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
              Kamu bangun aplikasinya.
              <br />
              <span className="landing-gradient-text">Bagdja urus uang &amp; identitasnya.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              Daftarkan aplikasimu di Console, dapatkan kredensial, lalu pakai layanan inti yang sama dengan yang
              menjalankan produk-produk Bagdja: login &amp; SSO, wallet, pembayaran, escrow, pencairan dana, event,
              dan log.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className="landing-btn-primary justify-center px-6 py-3 text-base">
                Buat akun &amp; daftarkan aplikasi
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#cara-kerja" className="landing-btn-ghost justify-center px-6 py-3 text-base">
                Lihat cara kerjanya
              </a>
            </div>
          </div>

          <div className="mt-16">
            <ArchitectureVisual />
          </div>
        </section>

        {/* Problem */}
        <section className="px-4 py-20 sm:px-6" aria-labelledby="masalah-title">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--action-primary)]">Masalahnya</p>
              <h2 id="masalah-title" className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Tampilan bisa jadi semalam. Fondasinya yang bikin lama.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
                AI mempercepat pembuatan layar dan fitur. Tapi begitu aplikasi menyentuh uang dan data pengguna,
                pekerjaan yang sama selalu muncul lagi di setiap proyek.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PAINS.map((p) => (
                <article key={p.title} className="landing-card rounded-2xl p-5">
                  <p.icon size={22} className="text-[var(--brand-info)]" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section id="fondasi" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Fondasi"
              title="Tiga lapis yang sudah jalan, tinggal disambungkan"
              lead="Semua dikelola dari Console. Ambil yang kamu butuhkan, biarkan sisanya."
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {PILLARS.map((pillar) => (
                <article key={pillar.title} className="landing-card group relative overflow-hidden rounded-2xl p-6">
                  <span className="landing-card-accent" aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                      <pillar.icon size={22} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm text-[var(--text-muted)]">{pillar.tag}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{pillar.lead}</p>
                  <ul className="mt-6 space-y-4 border-t border-[var(--border-default)] pt-6">
                    {pillar.items.map((item) => (
                      <li key={item.title} className="flex gap-3">
                        <item.icon size={18} className="mt-0.5 shrink-0 text-[var(--brand-info)]" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="cara-kerja" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Cara kerja" title="Dari daftar sampai transaksi pertama" />
            <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
              <ol className="relative space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step.n} className="landing-card relative flex gap-4 rounded-2xl p-5">
                    <span className="landing-step flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
                    </div>
                    {i < STEPS.length - 1 && <span className="landing-step-line" aria-hidden="true" />}
                  </li>
                ))}
              </ol>

              <div className="landing-panel min-w-0 overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#facc15]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/70" />
                  </div>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
                    <Code2 size={14} aria-hidden="true" /> app.module.ts
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed sm:p-5">
                  <code className="font-mono text-[#cbd5e1]">{SDK_SNIPPET}</code>
                </pre>
                <div className="flex items-center gap-2 border-t border-[var(--border-default)] px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                  <Plug size={14} className="text-[var(--brand-success)]" aria-hidden="true" />
                  npm install @bagdja/node-sdk
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & proof */}
        <section id="keamanan" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Keamanan"
              title="Uang orang lain, diperlakukan dengan serius"
              lead="Aturan keamanan diterapkan di layanan inti, jadi setiap aplikasi yang tersambung ikut terlindungi."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {SECURITY.map((s) => (
                <article key={s.title} className="landing-card flex gap-4 rounded-2xl p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-success)]/10 text-[var(--brand-success)]">
                    <s.icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering muncul" />
            <div className="mt-10 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="landing-faq landing-card group rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-white">
                    {f.q}
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-24 pt-8 sm:px-6">
          <div className="landing-cta relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Fokus ke produkmu. Fondasinya sudah siap.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-secondary)]">
                Buat akun, daftarkan aplikasi pertamamu, dan sambungkan layanan yang kamu butuhkan.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link href="/register" className="landing-btn-primary justify-center px-6 py-3 text-base">
                  Mulai sekarang
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/login" className="landing-btn-ghost justify-center px-6 py-3 text-base">
                  Sudah punya akun? Masuk
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-default)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[var(--text-muted)] sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="h-5 w-5" width={20} height={20} />
            <span>© {new Date().getFullYear()} Bagdja</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#fondasi" className="hover:text-white">Fondasi</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/login" className="hover:text-white">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
