'use client';

type FlyArgs = {
  from: HTMLElement | null;
  to: HTMLElement | null;
  label?: string;
};

export function flyToTicket({ from, to, label = '+1' }: FlyArgs) {
  if (!from || !to) return false;
  const source = from.getBoundingClientRect();
  const target = to.getBoundingClientRect();
  if (!Number.isFinite(source.left) || !Number.isFinite(target.left)) return false;

  const chip = document.createElement('span');
  chip.className = 'fly-chip';
  chip.textContent = label;
  chip.style.left = `${source.left + source.width / 2}px`;
  chip.style.top = `${source.top + source.height / 2}px`;
  document.body.appendChild(chip);

  requestAnimationFrame(() => {
    chip.style.transform = `translate(${target.left - source.left}px, ${target.top - source.top}px) scale(0.4)`;
    chip.style.opacity = '0';
  });

  window.setTimeout(() => chip.remove(), 450);
  return true;
}
