import { useRef, useState } from 'react';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import { reorderExercises, type WorkoutExercise } from '../../repositories/workouts';

const ROW = 56; // px, fixed so the pointer position maps straight to a list index

/**
 * Drag the handles to reorder; the new order is saved on drop. Pointer events + touch-action: none
 * on the handle keep the sheet from scrolling under the finger (works the same with mouse).
 */
export default function ReorderSheet({
  workoutId,
  exercises,
  onClose,
}: {
  workoutId: string;
  exercises: WorkoutExercise[];
  onClose: () => void;
}) {
  const [order, setOrder] = useState(exercises.map((e) => e.id));
  const [drag, setDrag] = useState<{ id: string; y: number } | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const grab = useRef(0);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const top = list.current!.getBoundingClientRect().top;
    const y = e.clientY - top - grab.current;
    const to = Math.max(0, Math.min(order.length - 1, Math.round(y / ROW)));
    setDrag({ id: drag.id, y });
    const from = order.indexOf(drag.id);
    if (to !== from) {
      const next = order.filter((id) => id !== drag.id);
      next.splice(to, 0, drag.id);
      setOrder(next);
    }
  };

  const drop = () => {
    if (!drag) return;
    setDrag(null);
    if (order.some((id, i) => id !== exercises[i]!.id)) void reorderExercises(workoutId, order);
  };

  return (
    <Sheet title="Reorder exercises" onClose={onClose}>
      <ul ref={list} className="relative pb-2" style={{ height: order.length * ROW + 8 }}>
        {order.map((id, i) => {
          const we = byId.get(id)!;
          const dragging = drag?.id === id;
          return (
            <li
              key={id}
              className={`absolute inset-x-0 flex items-center gap-3 rounded-xl px-3 ${
                dragging ? 'z-10 bg-neutral-700 shadow-xl shadow-black/50' : 'bg-neutral-800 transition-transform'
              }`}
              style={{ top: 0, height: ROW - 8, transform: `translateY(${dragging ? drag.y : i * ROW}px)` }}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{we.name}</span>
              <button
                className="flex h-10 w-10 touch-none items-center justify-center text-neutral-400"
                aria-label={`Drag ${we.name}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  grab.current = e.clientY - list.current!.getBoundingClientRect().top - i * ROW;
                  setDrag({ id, y: i * ROW });
                }}
                onPointerMove={move}
                onPointerUp={drop}
                onPointerCancel={drop}
              >
                <Icon name="dragHandle" className="h-6 w-6" />
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
