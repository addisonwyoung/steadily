import { Component, type ReactNode } from 'react';
import { Brand } from './ui';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="onboard">
          <Brand />
          <h1>Let’s take a moment.</h1>
          <p>
            The page could not finish opening. Reload to try again. Your saved browser data has not
            been cleared.
          </p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload the app
          </button>
        </main>
      );
    return this.props.children;
  }
}
