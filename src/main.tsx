import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/app';
import { ErrorBoundary } from './components/error-boundary';
import { FeedbackProvider } from './components/feedback';
import { createSteadilyStore } from './store/create-store';
import { StoreProvider } from './store/context';
import { registerHabitTools } from './lib/webmcp';
import './styles.css';

const store = createSteadilyStore({
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  },
});
const unregister = registerHabitTools(store);
if (import.meta.hot) import.meta.hot.dispose(unregister);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider store={store}>
        <FeedbackProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </FeedbackProvider>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);
