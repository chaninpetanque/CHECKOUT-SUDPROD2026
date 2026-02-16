import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Layout from './components/Layout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/scan" element={<Scanner />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
