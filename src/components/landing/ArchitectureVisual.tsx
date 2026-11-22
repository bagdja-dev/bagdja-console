import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Bot,
  Cloud,
  Globe,
  KeyRound,
  Mail,
  Radio,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Vault,
  Wallet,
} from 'lucide-react';

interface Node {
  icon: LucideIcon;
  label: string;
  hint: string;
}

const APPS: Node[] = [
  { icon: Globe, label: 'Web app', hint: 'Next.js, Laravel, apa saja' },
  { icon: Smartphone, label: 'Mobile app', hint: 'Flutter, React Native' },
  { icon: Bot, label: 'Dibuat dengan AI', hint: 'Claude, Cursor, dkk.' },
];

const CORE: Node[] = [
  { icon: KeyRound, label: 'Identitas & SSO', hint: 'auth' },
  { icon: Wallet, label: 'Wallet & pembayaran', hint: 'payment' },
  { icon: Vault, label: 'Escrow & payout', hint: 'payment' },
  { icon: Radio, label: 'Event & webhook', hint: 'event' },
  { icon: Mail, label: 'Email & notifikasi', hint: 'messaging' },
  { icon: ScrollText, label: 'Log terpusat', hint: 'log' },
];

const RAILS: Node[] = [
  { icon: ShieldCheck, label: 'Payment gateway', hint: 'QRIS, VA, e-wallet' },
  { icon: Banknote, label: 'Rekening bank', hint: 'Pencairan dana' },
  { icon: Cloud, label: 'Storage', hint: 'File & aset' },
];

function NodeCard({ node, align = 'left' }: { node: Node; align?: 'left' | 'right' }) {
  const Icon = node.icon;
  return (
    <div
      className={`landing-node flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        align === 'right' ? 'lg:flex-row-reverse lg:text-right' : ''
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--brand-info)]">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug text-white">{node.label}</span>
        <span className="block text-xs text-[var(--text-muted)]">{node.hint}</span>
      </span>
    </div>
  );
}

/** Flow connector: horizontal on desktop, vertical on mobile. */
function Flow({ delay = 0 }: { delay?: number }) {
  return (
    <div className="landing-flow" aria-hidden="true">
      <span className="landing-flow-packet" style={{ animationDelay: `${delay}s` }} />
    </div>
  );
}

/**
 * Hero diagram: your app → Bagdja core services (managed from Console) → external rails.
 * Pure HTML/CSS so it reflows from a 3-column flow (desktop) to a vertical stack (mobile).
 */
export function ArchitectureVisual() {
  return (
    <figure
      className="landing-panel relative mx-auto w-full max-w-5xl rounded-2xl p-4 sm:p-6"
      aria-label="Diagram: aplikasimu terhubung ke layanan inti Bagdja yang dikelola lewat Console, lalu ke payment gateway, bank, dan storage."
    >
      <div className="mb-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
        <span className="h-2 w-2 rounded-full bg-[var(--brand-success)] landing-pulse" />
        alur integrasi
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1.35fr_auto_1fr] lg:gap-0">
        {/* Apps */}
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Aplikasimu</p>
          {APPS.map((n) => (
            <NodeCard key={n.label} node={n} />
          ))}
        </div>

        <Flow />

        {/* Core */}
        <div className="landing-core relative rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" className="h-6 w-6" width={24} height={24} />
              <p className="text-sm font-semibold text-white">Bagdja Core</p>
            </div>
            <span className="rounded-full border border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--action-primary)]">
              dikelola via Console
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {CORE.map((n) => (
              <NodeCard key={n.label} node={n} />
            ))}
          </div>
        </div>

        <Flow delay={1.1} />

        {/* External rails */}
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] lg:text-right">
            Jaringan luar
          </p>
          {RAILS.map((n) => (
            <NodeCard key={n.label} node={n} align="right" />
          ))}
        </div>
      </div>
    </figure>
  );
}
