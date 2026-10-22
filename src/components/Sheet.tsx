import type { ReactNode } from 'react';

/** Bottom sheet over a dimmed backdrop; tap outside to close. */
export default function Sheet({
  title,
  onClose,
  children,
  full = false,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className={`flex flex-col rounded-t-2xl bg-neutral-900 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          full ? 'h-[92%]' : 'max-h-[85%]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="px-2 text-neutral-400" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">{children}</div>
      </div>
    </div>
  );
}

export const btn = {
  primary: 'rounded-xl bg-green-600 px-4 py-3 font-semibold text-white active:bg-green-700 disabled:opacity-40',
  secondary: 'rounded-xl bg-neutral-800 px-4 py-3 font-medium active:bg-neutral-700',
  danger: 'rounded-xl bg-neutral-800 px-4 py-3 font-medium text-red-400 active:bg-neutral-700',
  chip: (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm ${on ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-300'}`,
};

export const input =
  'w-full rounded-xl bg-neutral-800 px-3 py-2.5 text-base outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-green-600';
