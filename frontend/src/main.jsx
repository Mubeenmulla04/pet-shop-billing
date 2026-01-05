import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import './index.css';
import App from './App.jsx';
import PasswordProtection from './PasswordProtection.jsx';

function Main() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return <PasswordProtection onUnlock={() => setIsUnlocked(true)} />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <Main />
);