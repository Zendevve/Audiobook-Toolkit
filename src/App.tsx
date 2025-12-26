import Dashboard from './components/Dashboard';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <div className="noise-overlay" />
      <div className="grid-overlay" />
      <Dashboard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0a0a0c',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: '#EDEDEF',
          },
          className: 'font-sans',
        }}
        theme="dark"
        richColors
        closeButton
      />
    </>
  );
}

export default App;

