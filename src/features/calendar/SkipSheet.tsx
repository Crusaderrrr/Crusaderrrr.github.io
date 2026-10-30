import { useState } from 'react';
import RatingPicker from '../../components/RatingPicker';
import Sheet from '../../components/Sheet';
import { btn, input } from '../../components/ui';
import type { Rating } from '../../domain/checkIn';
import { removeSkip, saveSkip, SKIP_REASON_NAMES, SKIP_REASONS, type Skip, type SkipReason } from '../../repositories/skips';
import { formatDate } from '../history/HistoryScreen';

export default function SkipSheet({ date, skip, onClose }: { date: string; skip?: Skip; onClose: () => void }) {
  const [reason, setReason] = useState<SkipReason | null>(skip?.reason ?? null);
  const [note, setNote] = useState(skip?.note ?? '');
  const [rating, setRating] = useState<Rating | null>(skip?.rating ?? null);

  return (
    <Sheet title={`Skipped · ${formatDate(date)}`} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex flex-wrap gap-2">
          {SKIP_REASONS.map((r) => (
            <button key={r} className={btn.chip(r === reason)} onClick={() => setReason(r)}>
              {SKIP_REASON_NAMES[r]}
            </button>
          ))}
        </div>
        <input className={input} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-400">How are you feeling? (optional)</span>
          <RatingPicker value={rating} onChange={setRating} />
        </div>
        <button
          className={btn.primary}
          disabled={!reason}
          onClick={async () => {
            await saveSkip({ date, reason: reason!, note: note.trim() || null, rating });
            onClose();
          }}
        >
          Save
        </button>
        {skip && (
          <button
            className={btn.danger}
            onClick={async () => {
              await removeSkip(date);
              onClose();
            }}
          >
            Remove skip
          </button>
        )}
      </div>
    </Sheet>
  );
}
