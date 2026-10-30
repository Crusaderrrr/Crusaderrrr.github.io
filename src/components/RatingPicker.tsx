import { btn } from './ui';
import { RATING_COLOR, RATING_NAMES, RATINGS, type Rating } from '../domain/checkIn';

/** Good / Okay / Bad; tapping the chosen one again clears it (the rating is optional). */
export default function RatingPicker({ value, onChange }: { value: Rating | null; onChange: (r: Rating | null) => void }) {
  return (
    <div className="flex gap-2">
      {RATINGS.map((r) => (
        <button
          key={r}
          className={`${btn.chip(r === value)} flex items-center gap-2`}
          onClick={() => onChange(r === value ? null : r)}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RATING_COLOR[r] }} />
          {RATING_NAMES[r]}
        </button>
      ))}
    </div>
  );
}
