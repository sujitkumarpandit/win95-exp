import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WinWindow, WinButton, WinInput } from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [dbError, setDbError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if database is configured
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'error') {
          setDbError(data.message);
        }
      })
      .catch(() => setDbError('Could not communicate with the backend server.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      login(data.accessToken, data.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <WinWindow title="User Login" className="w-full max-w-[350px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm">Email Address:</label>
            <WinInput 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Password:</label>
            <WinInput 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && <div className="text-red-700 text-xs font-bold bg-white p-1 border border-red-300">{error}</div>}
          
          {dbError && (
            <div className="bg-yellow-100 border-2 border-yellow-600 p-2 text-[11px]">
              <p className="font-bold text-red-700">SYSTEM ERROR: DATABASE NOT CONNECTED</p>
              <p className="mt-1">{dbError}</p>
              <p className="mt-1">Fix: Set "DATABASE_URL" in Secrets (e.g. from Neon.tech)</p>
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <Link to="/register" className={`text-blue-800 text-sm hover:underline ${dbError ? 'pointer-events-none opacity-50' : ''}`}>New User?</Link>
            <WinButton type="submit" disabled={loading || !!dbError}>
              {loading ? 'Wait...' : 'OK'}
            </WinButton>
          </div>
        </form>
      </WinWindow>
    </div>
  );
}
