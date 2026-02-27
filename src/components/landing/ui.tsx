import React from 'react';

type Classy = { className?: string };

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export function Panel({ children, className, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) {
  return <section {...props} className={cx('rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_8px_24px_rgba(2,6,23,0.35)]', className)}>{children}</section>;
}

export function PanelHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h3>
        {subtitle ? <p className="text-xs text-white/60">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Chip({ children, variant = 'neutral', className, ...props }: React.PropsWithChildren<{ variant?: 'neutral' | 'good' | 'warn' | 'bad' } & Classy & React.HTMLAttributes<HTMLSpanElement>>) {
  const tone = variant === 'good'
    ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
    : variant === 'warn'
      ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
      : variant === 'bad'
        ? 'border-rose-300/30 bg-rose-300/10 text-rose-100'
        : 'border-white/10 bg-white/5 text-white/80';
  return <span {...props} className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', tone, className)}>{children}</span>;
}

export function MicroBar({ value, className }: { value: number } & Classy) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx('h-px w-16 overflow-hidden rounded bg-white/15', className)} aria-hidden="true">
      <div className="h-full rounded bg-gradient-to-r from-cyan-400/70 to-emerald-300/75" style={{ width: `${normalized}%` }} />
    </div>
  );
}

export function IconButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-900/80 text-base font-semibold text-slate-100 transition hover:border-cyan-300/50 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40', className)}
    >
      {children}
    </button>
  );
}

export function SlipRow({
  leftPrimary,
  leftSecondary,
  right,
  className
}: {
  leftPrimary: React.ReactNode;
  leftSecondary?: React.ReactNode;
  right?: React.ReactNode;
} & Classy) {
  return (
    <div className={cx('flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/65 px-2.5 py-1.5', className)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{leftPrimary}</p>
        {leftSecondary ? <p className="truncate text-xs text-white/60">{leftSecondary}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function Divider({ className }: Classy) {
  return <div className={cx('h-px w-full bg-white/10', className)} aria-hidden="true" />;
}

export function SectionTitle({ children, className }: React.PropsWithChildren<Classy>) {
  return <h3 className={cx('text-xl font-semibold tracking-tight text-slate-100', className)}>{children}</h3>;
}
