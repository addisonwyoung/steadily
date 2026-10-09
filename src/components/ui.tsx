import { useId, type ReactNode } from 'react';

export function Brand() {
  return (
    <div className="brand">
      <i className="mark" aria-hidden="true" />
      steadily
    </div>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Rating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange(value: number): void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        {label} <output>{value}</output>/5
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="rating">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
export function ErrorMessage({ error }: { error: string | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
