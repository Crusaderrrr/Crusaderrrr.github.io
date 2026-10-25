import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import AuthGate from './features/auth/AuthGate';
import { dbReady } from './db/client';
import { recordLaunch } from './repositories/meta';
import './index.css';

// Best effort only; backups are the real safety net (SPEC §7).
navigator.storage?.persist?.().catch(() => {});
// Here rather than in an effect so StrictMode doesn't double-count.
dbReady.then(recordLaunch).catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthGate>
        <App />
      </AuthGate>
    </HashRouter>
  </StrictMode>,
);
