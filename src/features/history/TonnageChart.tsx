import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { btn, card } from '../../components/ui';
import { addDays, parseLocalDate, today } from '../../domain/dates';
import { RANGES, rangeStart, tonnage, type Range } from '../../domain/progress';
import { formatWeight } from '../../domain/sets';

const shortDate = (d: string) => parseLocalDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
/** Week bars are keyed by their Monday; the label spans Monday to Sunday ("26 Oct – 1 Nov"). */
const weekRange = (d: string) => `${shortDate(d)} – ${shortDate(addDays(d, 6))}`;

/** Total volume (completed working sets, kg × reps) per workout or per week. */
export default function TonnageChart({ workouts }: { workouts: { date: string; volume: number }[] }) {
  const [range, setRange] = useState<Range>('3M');
  const [by, setBy] = useState<'workout' | 'week'>('week');
  const data = tonnage(workouts, by, rangeStart(range, today()));

  return (
    <section className={`${card} flex flex-col gap-3 p-3`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Total tonnage</h2>
        <div className="flex gap-1">
          <button className={btn.chip(by === 'week')} onClick={() => setBy('week')}>
            Week
          </button>
          <button className={btn.chip(by === 'workout')} onClick={() => setBy('workout')}>
            Workout
          </button>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-sm text-neutral-500">No workouts in this range</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#262626" vertical={false} />
            <XAxis dataKey="date" tickFormatter={by === 'week' ? weekRange : shortDate} tick={{ fill: '#737373', fontSize: 11 }} stroke="#262626" />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} stroke="#262626" />
            <Tooltip
              cursor={{ fill: '#ffffff10' }}
              contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 12 }}
              labelFormatter={(d) => (by === 'week' ? weekRange(String(d)) : shortDate(String(d)))}
              formatter={(v) => [`${formatWeight(Number(v))} kg`, 'Tonnage']}
            />
            <Bar dataKey="volume" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex justify-center gap-2">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <button key={r} className={btn.chip(r === range)} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>
    </section>
  );
}
