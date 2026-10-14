import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Global error logger for mobile troubleshooting
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Si-Praja Global Window Error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Si-Praja Unhandled Promise Rejection:', event.reason);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  console.error('Root element not found');
}

