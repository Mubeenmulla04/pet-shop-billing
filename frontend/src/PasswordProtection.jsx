import { useState } from 'react';

const PasswordProtection = ({ onAccessGranted }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // The correct password is 902155
  const CORRECT_PASSWORD = '902155';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onAccessGranted();
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#1f2937', 
          marginBottom: '10px',
          background: 'linear-gradient(90deg, #818cf8 0%, #c7d2fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Pet Shop Billing
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          Enter password to access the application
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter 6-digit password"
              maxLength="6"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: '2px solid #d1d5db',
                fontSize: '16px',
                textAlign: 'center',
                outline: 'none'
              }}
              autoFocus
            />
          </div>
          
          {error && (
            <div style={{ 
              color: '#ef4444', 
              marginBottom: '20px',
              padding: '10px',
              background: '#fee2e2',
              borderRadius: '6px'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Access Application
          </button>
        </form>
        
        <p style={{ 
          color: '#9ca3af', 
          fontSize: '14px', 
          marginTop: '20px',
          fontStyle: 'italic'
        }}>
        </p>
      </div>
    </div>
  );
};

export default PasswordProtection;