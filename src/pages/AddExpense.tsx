import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  WinWindow, 
  WinButton, 
  WinInput, 
  WinSelect 
} from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';
import { CATEGORIES, PAYMENT_METHODS, EXPENSE_STATUSES, Expense } from '../types';

export default function AddExpense() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0],
    description: '',
    amount: '',
    payment_method: PAYMENT_METHODS[0],
    status: EXPENSE_STATUSES[0],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!id;

  const fetchCustomCategories = async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCustomCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomCategories();
  }, [token]);

  useEffect(() => {
    if (isEdit && location.state?.expense) {
      const e = location.state.expense as Expense;
      setFormData({
        date: e.date.split('T')[0],
        category: e.category,
        description: e.description,
        amount: e.amount.toString(),
        payment_method: e.payment_method,
        status: e.status,
      });
    }
  }, [id, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let finalCategory = formData.category;

    try {
      if (showCustomInput && newCategoryName.trim()) {
        // Create custom category first
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        if (catRes.ok) {
          finalCategory = newCategoryName.trim();
        }
      }

      const url = isEdit ? `/api/expenses/${id}` : '/api/expenses';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          category: finalCategory,
          amount: parseFloat(formData.amount)
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Operation failed');
      }
      
      navigate('/expenses');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const allCategories = Array.from(new Set([
    ...CATEGORIES, 
    ...customCategories,
    ...(formData.category ? [formData.category] : [])
  ]));

  return (
    <div className="flex justify-center p-4">
      <WinWindow title={isEdit ? "Modify Registry Entry" : "Create New Registry Entry"} className="w-full max-w-[450px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs">Transaction Date:</label>
              <WinInput 
                type="date" 
                required 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs">Amount ($):</label>
              <WinInput 
                type="number" 
                step="0.01"
                required 
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs">Category:</label>
            <div className="flex gap-2">
              <div className="flex-1">
                {!showCustomInput ? (
                  <WinSelect 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </WinSelect>
                ) : (
                  <WinInput 
                    placeholder="Enter custom category..." 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    required={showCustomInput}
                  />
                )}
              </div>
              <WinButton 
                type="button" 
                onClick={() => {
                  setShowCustomInput(!showCustomInput);
                  if (showCustomInput) setNewCategoryName('');
                }}
                className="text-[10px] px-2"
              >
                {showCustomInput ? "List" : "New+"}
              </WinButton>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs">Description:</label>
            <textarea 
              className="win-input h-20 resize-none"
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs">Payment Method:</label>
              <WinSelect 
                value={formData.payment_method}
                onChange={e => setFormData({...formData, payment_method: e.target.value})}
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </WinSelect>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs">Processing Status:</label>
              <WinSelect 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                {EXPENSE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </WinSelect>
            </div>
          </div>

          {error && <div className="text-red-700 font-bold bg-white p-1 border border-red-300 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <WinButton type="button" onClick={() => navigate('/expenses')}>Cancel</WinButton>
            <WinButton type="submit" disabled={loading} className="px-8 font-bold">
              {loading ? 'Transmitting...' : 'Commit Changes'}
            </WinButton>
          </div>
        </form>
      </WinWindow>
    </div>
  );
}
