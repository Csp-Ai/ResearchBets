'use client';

type TraceReplayControlsProps = {
  isLive: boolean;
  isPlaying: boolean;
  speed: 0.5 | 1 | 2;
  progress: number;
  disabled?: boolean;
  onLiveToggle: (next: boolean) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: 0.5 | 1 | 2) => void;
  onProgressChange: (progress: number) => void;
};

export function TraceReplayControls({
  isLive,
  isPlaying,
  speed,
  progress,
  disabled,
  onLiveToggle,
  onPlayPause,
  onSpeedChange,
  onProgressChange,
}: TraceReplayControlsProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || isLive}
          onClick={onPlayPause}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          Speed
          <select
            value={speed}
            disabled={disabled || isLive}
            onChange={(event) => onSpeedChange(Number(event.target.value) as 0.5 | 1 | 2)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </label>

        <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={isLive} onChange={(event) => onLiveToggle(event.target.checked)} />
          Live
        </label>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] text-slate-400">Replay timeline ({Math.round(progress)}%)</label>
        <input
          aria-label="Replay scrubber"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={progress}
          disabled={disabled || isLive}
          onChange={(event) => onProgressChange(Number(event.target.value))}
          className="w-full accent-cyan-400 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
