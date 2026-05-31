import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Master from './pages/Master';
import Event from './pages/Event';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('master');

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#2e1065'}}>
        <div style={{textAlign:'center',color:'white'}}>
          <div style={{width:'40px',height:'40px',border:'3px solid rgba(255,255,255,0.2)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 12px'}}/>
          <p style={{fontSize:'14px',opacity:0.6}}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const renderTab = () => {
    switch (activeTab) {
      case 'master': return <Master />;
      case 'events': return <Event />;
      case 'attendance': return <Attendance />;
      case 'reports': return <Reports />;
      default: return <Master />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTab()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(109,40,217,0.15)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </AuthProvider>
  );
}
