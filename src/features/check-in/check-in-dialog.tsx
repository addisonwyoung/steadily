import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/modal';
import { Rating, ErrorMessage, errorMessage } from '../../components/ui';
import { useSteadily } from '../../store/context';
import { getRecommendation, isComplete } from '../../domain/selectors';
import { reasons, type Reason } from '../../domain/schema';

export function CheckInDialog({ today, onClose }: { today: string; onClose(): void }) {
  const data = useSteadily((state) => state.data);
  const saveCheckIn = useSteadily((state) => state.saveCheckIn);
  const previous = data.checks[today];
  const [mood, setMood] = useState(previous?.mood ?? 3);
  const [energy, setEnergy] = useState(previous?.energy ?? 3);
  const [stress, setStress] = useState(previous?.stress ?? 3);
  const [win, setWin] = useState(previous?.win ?? '');
  const [missedReasons, setMissedReasons] = useState<Record<string, Reason>>(() =>
    Object.fromEntries(
      data.habits.flatMap((habit) => {
        const reason = data.logs[today]?.[habit.id]?.reason;
        return reason ? [[habit.id, reason]] : [];
      }),
    ),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = data.habits.filter((habit) => !isComplete(data.logs[today]?.[habit.id]));
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      saveCheckIn({ mood, energy, stress, win }, missedReasons);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Modal
      title={saved ? 'Thank you for showing up.' : 'How did today feel?'}
      description={
        saved
          ? 'You took a moment to notice your day. Your progress is safe, even when things didn’t go to plan.'
          : 'A quick pause. No perfect answers.'
      }
      onClose={onClose}
    >
      {saved ? (
        <>
          {pending.length > 0 && <div className="callout">{getRecommendation(data, today)}</div>}
          <button className="primary full" onClick={onClose}>
            Close and enjoy your evening
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <Rating label="Mood" value={mood} onChange={setMood} />
          <Rating label="Energy" value={energy} onChange={setEnergy} />
          <Rating label="Stress" value={stress} onChange={setStress} />
          <label htmlFor="check-win">
            One small win <span className="muted">(optional)</span>
          </label>
          <input
            id="check-win"
            maxLength={240}
            value={win}
            onChange={(event) => setWin(event.target.value)}
            placeholder="I got outside for a few minutes"
          />
          {pending.map((habit) => (
            <div key={habit.id}>
              <label htmlFor={`reason-${habit.id}`}>
                What got in the way of {habit.title.toLowerCase()}?
              </label>
              <select
                id={`reason-${habit.id}`}
                required
                value={missedReasons[habit.id] ?? ''}
                onChange={(event) =>
                  setMissedReasons({ ...missedReasons, [habit.id]: event.target.value as Reason })
                }
              >
                <option value="">Choose a reason</option>
                {reasons.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </div>
          ))}
          <ErrorMessage error={error} />
          <button className="primary full">Save my check-in</button>
        </form>
      )}
    </Modal>
  );
}
