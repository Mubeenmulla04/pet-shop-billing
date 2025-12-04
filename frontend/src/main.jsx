import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// import App from './App.jsx';
import TestApp from './TestApp.jsx';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{color: 'red', padding: '20px'}}>Something went wrong. Please check the console for details.</div>;
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <TestApp />
  </ErrorBoundary>
);