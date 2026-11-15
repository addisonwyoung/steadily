import { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { PageHeading } from '../../components/ui';
import { usePomodoro } from './pomodoro';
import { FocusReport } from './focus-report';

export default function ProductivityPage() {
  const timer = usePomodoro();
  const [focus, setFocus] = useState(String(timer.lengths.focus));
  const [rest, setRest] = useState(String(timer.lengths.break));
  const minutes = Math.floor(timer.remaining / 60);
  const seconds = timer.remaining % 60;
  const progress = 1 - timer.remaining / (timer.lengths[timer.mode] * 60);
  const isBreak = timer.mode === 'break';
  return (
    <>
      <PageHeading
        title="Make room for focus."
        description="One task, a little focus, then a moment to recharge."
      />
      <div className="grid productivity-grid">
        <section
          className={`card pomodoro ${isBreak ? 'is-break' : ''} ${timer.running ? 'is-running' : ''}`}
          aria-label="Pomodoro timer"
        >
          <div className="pomodoro-top">
            <span className="eyebrow">A little space to focus</span>
            <span className="pomodoro-state">
              <i />
              {timer.running ? 'In progress' : progress > 0 ? 'Paused' : 'Ready'}
            </span>
          </div>
          <label htmlFor="focus-habit">What are you focusing on?</label>
          <select
            id="focus-habit"
            value={timer.selectedHabitId}
            disabled={timer.lockedHabit || timer.blocked}
            onChange={(event) => timer.selectHabit(event.target.value)}
          >
            <option value="">Choose one of your habits</option>
            {timer.habits
              .filter((habit) => habit.templateId)
              .map((habit) => (
                <option key={habit.id} value={habit.templateId}>
                  {habit.title}
                </option>
              ))}
            {timer.active &&
              !timer.habits.some((habit) => habit.templateId === timer.active?.habitId) && (
                <option value={timer.active.habitId}>Previously selected habit</option>
              )}
          </select>
          {timer.lockedHabit && (
            <p className="note">
              The habit stays linked while this session is running or paused. Reset cancels the
              unfinished session.
            </p>
          )}
          {timer.blocked && (
            <p role="alert">
              Your saved timer could not be read. Reset to start fresh; a recovery copy will be
              preserved.
            </p>
          )}
          {timer.storageError && <p role="alert">{timer.storageError}</p>}
          <div className="pomodoro-modes" role="group" aria-label="Timer mode">
            <button aria-pressed={timer.mode === 'focus'} onClick={() => timer.reset('focus')}>
              <Sparkles size={16} aria-hidden="true" /> Focus
            </button>
            <button aria-pressed={timer.mode === 'break'} onClick={() => timer.reset('break')}>
              <Coffee size={16} aria-hidden="true" /> Break
            </button>
          </div>
          <div className="pomodoro-dial">
            <svg viewBox="0 0 320 320" aria-hidden="true">
              <circle className="dial-track" cx="160" cy="160" r="146" />
              <circle
                className="dial-progress"
                cx="160"
                cy="160"
                r="146"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={progress * 100}
              />
            </svg>
            <div className="dial-content">
              <span className="dial-icon">
                {isBreak ? <Coffee size={22} /> : <Sparkles size={22} />}
              </span>
              <h2>{isBreak ? 'Take a breather' : 'Time to focus'}</h2>
              <div
                className="pomodoro-clock"
                role="timer"
                aria-label={`${timer.mode} time remaining`}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <span className="dial-caption">
                {timer.running
                  ? isBreak
                    ? 'Relax. You’ve earned this.'
                    : 'One thing at a time.'
                  : progress > 0
                    ? 'Take your time. Come back ready.'
                    : 'Your next small step starts here.'}
              </span>
            </div>
          </div>
          <div className="pomodoro-controls">
            <button
              className="primary"
              onClick={timer.toggle}
              disabled={
                timer.blocked ||
                (!isBreak &&
                  !timer.active &&
                  !timer.habits.some((habit) => habit.templateId === timer.selectedHabitId))
              }
            >
              {timer.running ? (
                <Pause size={18} aria-hidden="true" />
              ) : (
                <Play size={18} aria-hidden="true" />
              )}{' '}
              {timer.running ? 'Pause' : 'Start'}
            </button>
            <button onClick={() => timer.reset()}>
              <RotateCcw size={17} aria-hidden="true" />
              Reset
            </button>
          </div>
          {timer.pending.length > 0 && (
            <div className="focus-save-state">
              <p role="status">
                {timer.saving
                  ? 'Saving focus session…'
                  : `${timer.pending.length} completed session(s) waiting to save.`}
              </p>
              {timer.saveError && (
                <>
                  <p role="alert">{timer.saveError}</p>
                  <button disabled={timer.saving} onClick={timer.retrySaving}>
                    Retry session save
                  </button>
                </>
              )}
            </div>
          )}
          <p className="note pomodoro-message" role="status">
            {timer.message}
          </p>
        </section>
        <section className="card rhythm-card">
          <div className="rhythm-heading">
            <span className="rhythm-icon">
              <SlidersHorizontal size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="eyebrow">Make it yours</span>
              <h2>Your rhythm</h2>
            </div>
          </div>
          <p>Start with 25 minutes of focus and a 5-minute break, or choose what works for you.</p>
          <div className="rhythm-presets" role="group" aria-label="Duration presets">
            {[
              { label: 'Quick start', focus: 15, rest: 3 },
              { label: 'Classic', focus: 25, rest: 5 },
              { label: 'Deep focus', focus: 50, rest: 10 },
            ].map((preset) => (
              <button
                key={preset.label}
                aria-pressed={Number(focus) === preset.focus && Number(rest) === preset.rest}
                onClick={() => {
                  setFocus(String(preset.focus));
                  setRest(String(preset.rest));
                  timer.customize(preset.focus, preset.rest);
                }}
              >
                <strong>{preset.label}</strong>
                <span>
                  {preset.focus} / {preset.rest} min
                </span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              timer.customize(Number(focus), Number(rest));
            }}
          >
            <label htmlFor="focus-minutes">Focus length (minutes)</label>
            <input
              id="focus-minutes"
              type="number"
              min="1"
              max="180"
              step="1"
              required
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
            />
            <label htmlFor="break-minutes">Break length (minutes)</label>
            <input
              id="break-minutes"
              type="number"
              min="1"
              max="180"
              step="1"
              required
              value={rest}
              onChange={(event) => setRest(event.target.value)}
            />
            <p className="note">Choose 1–180 minutes. Applying changes resets the current timer.</p>
            <button className="pomodoro-apply" type="submit">
              Apply durations <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="note">
            When a session ends, the next timer is ready. Press Start when you’re ready to continue.
            Your timer recovers after refresh in this browser. Keep using the same account and
            browser to resume it. Completed sessions are saved to your account; they do not
            automatically mark a habit complete.
          </p>
        </section>
      </div>
      <FocusReport />
    </>
  );
}
