import { parseLocalDate, today } from '../../domain/dates';

export default function TodayScreen() {
  const label = parseLocalDate(today()).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <div>
      <h1 className="text-2xl font-bold">Today</h1>
      <p className="text-neutral-400">{label}</p>
    </div>
  );
}
