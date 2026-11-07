import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/app';
import { ErrorBoundary } from './components/error-boundary';
import { FeedbackProvider } from './components/feedback';
import { AuthProvider } from './features/auth/auth-context';
import { AccountStore } from './store/account-store';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AccountStore>
          <FeedbackProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </FeedbackProvider>
        </AccountStore>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
