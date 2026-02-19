import React from 'react';
import type { ReactNode } from 'react';

export function SkeletonBlock({ className = 'h-24 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/70 ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm">
      <p className="font-medium text-slate-100">{title}</p>
      <p className="mt-1 text-slate-400">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
  details,
}: {
  message: string;
  onRetry?: () => void;
  details?: string;
}) {
  return (
    <div className="rounded-lg border border-rose-700/70 bg-rose-950/40 p-3 text-sm text-rose-100">
      <p>{message}</p>
      {details ? <p className="mt-1 text-xs text-rose-200/80">{details}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-rose-500 px-2 py-1 text-xs"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
