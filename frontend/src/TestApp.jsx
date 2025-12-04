import { useState } from 'react';
import PasswordProtection from './PasswordProtection';

const TestApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // If not authenticated, show password protection screen
  if (!isAuthenticated) {
    return <PasswordProtection onAccessGranted={() => setIsAuthenticated(true)} />;
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Application</h1>
      <p>If you're seeing this, the password protection is working correctly!</p>
      <button onClick={() => setIsAuthenticated(false)}>Logout</button>
    </div>
  );
};

export default TestApp;