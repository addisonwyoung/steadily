import { useState, type FormEvent } from 'react';
import { challenges } from '../../domain/content';
import { useSteadily } from '../../store/context';
import { Modal } from '../../components/modal';
import { Rating, ErrorMessage, errorMessage } from '../../components/ui';
import { useFeedback } from '../../components/feedback';

export function ChallengeCard({ today }: { today: string }) {
  const entries = useSteadily((state) => state.data.challenge);
  const count = entries.length;
  const task = challenges[Math.min(count, 6)]!;
  const already = entries.some((entry) => entry.date >= today);
  const [open, setOpen] = useState(false);
  return (
    <section className="card challenge">
      <span className="eyebrow">7 days of a little less noise</span>
      <h2>{count === 7 ? 'More room for what matters.' : task.title}</h2>
      <p>
        {count === 7
          ? 'You explored seven ways to spend time offline. Keep the one that made your day feel better.'
          : task.description}
      </p>
      <div className="days" aria-label={`${count} of 7 activities completed`}>
        {challenges.map((_, index) => (
          <span
            key={index}
            className={`daydot ${index < count ? 'done' : index === count ? 'current' : ''}`}
            aria-hidden="true"
          >
            {index < count ? '✓' : index + 1}
          </span>
        ))}
      </div>
      <div className="row">
        <small>{count}/7 activities complete</small>
        <button className="small" onClick={() => setOpen(true)} disabled={count === 7 || already}>
          {count === 7 ? 'Completed' : already ? 'See you tomorrow' : 'I tried it →'}
        </button>
      </div>
      {already && count < 7 && (
        <p className="note">One activity is enough today. Your next one will be here tomorrow.</p>
      )}
      {open && <ChallengeDialog title={task.title} onClose={() => setOpen(false)} />}
    </section>
  );
}
function ChallengeDialog({ title, onClose }: { title: string; onClose(): void }) {
  const complete = useSteadily((state) => state.completeChallenge);
  const notify = useFeedback();
  const [difficulty, setDifficulty] = useState(3);
  const [enjoyment, setEnjoyment] = useState(3);
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      complete(difficulty, enjoyment);
      notify('A little more room for life offline.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Modal title="What was that like?" description={title} onClose={onClose}>
      <form onSubmit={submit}>
        <Rating label="Difficulty" value={difficulty} onChange={setDifficulty} />
        <Rating label="Enjoyment" value={enjoyment} onChange={setEnjoyment} />
        <ErrorMessage error={error} />
        <button className="primary full">Save today’s activity</button>
      </form>
    </Modal>
  );
}
