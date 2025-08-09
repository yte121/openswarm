import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ModelsPage from './pages/ModelsPage';
import TasksPage from './pages/TasksPage';
import AgentsPage from './pages/AgentsPage';
import ConfigPage from './pages/ConfigPage';
import { WebSocketProvider } from './hooks/useWebSocket';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/config" element={<ConfigPage />} />
              </Routes>
            </div>
          </main>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;