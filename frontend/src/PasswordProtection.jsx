import { useState } from 'react';

const PasswordProtection = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Correct password is 902155
    if (password === '902155') {
      onUnlock();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword(''); // Clear the input field
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        padding: '2rem',
        borderRadius: '10px',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Password Protected</h2>
        <p style={{ marginBottom: '1.5rem', color: '#d1d5db' }}>
          Please enter the password to access this application.
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '5px',
              border: '1px solid #4b5563',
              backgroundColor: '#111827',
              color: 'white',
              marginBottom: '1rem',
              fontSize: '1rem'
            }}
            autoFocus
          />
          
          {error && (
            <p style={{ 
              color: '#ef4444', 
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </p>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordProtection;