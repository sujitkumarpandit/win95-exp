import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WinWindow, WinButton, WinInput } from '../components/RetroUI';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      navigate('/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <WinWindow title="New User Registration" className="w-full max-w-[400px]">
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
          <div className="flex flex-col gap-1">
            <label className="text-sm">Confirm Password:</label>
            <WinInput 
              type="password" 
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          {error && <div className="text-red-700 text-xs font-bold p-1 border border-red-300">{error}</div>}

          <div className="flex justify-between items-center mt-2">
            <Link to="/login" className="text-blue-800 text-sm hover:underline">Already registered?</Link>
            <WinButton type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Register'}
            </WinButton>
          </div>
        </form>
      </WinWindow>
    </div>
  );
}
