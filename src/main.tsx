import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppContent } from './App';
import { DiskaiProvider } from './context/DiskaiContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DiskaiProvider>
      <AppContent />
    </DiskaiProvider>
  </React.StrictMode>
);
