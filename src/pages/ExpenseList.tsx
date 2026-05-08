import React, { useEffect, useState } from 'react';
import { 
  WinWindow, 
  WinButton, 
  WinTable, 
  WinTableHeader, 
  WinTableHead, 
  WinTableCell,
  WinSelect,
  WinInput
} from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';
import { Expense, CATEGORIES } from '../types';
import { Trash2, Edit3, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchExpenses = () => {
    fetch('/api/expenses', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setExpenses(data))
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchExpenses();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    return (!categoryFilter || e.category === categoryFilter) &&
           (!dateFilter || e.date.includes(dateFilter));
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <WinWindow title="Filter Records">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs">Category:</label>
            <WinSelect className="w-full sm:w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">(All Categories)</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </WinSelect>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs">Date Filter (Year/Month):</label>
            <WinInput 
              type="text" 
              placeholder="e.g. 2026-05" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
          <WinButton className="w-full sm:w-auto" onClick={() => { setCategoryFilter(''); setDateFilter(''); }}>
             Clear Configuration
          </WinButton>
        </div>
      </WinWindow>

      <WinWindow title="Current Expenses Registry" className="flex-1 min-h-0 flex flex-col [&>div:last-child]:min-h-0 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:flex-1">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <WinTable>
              <WinTableHeader>
              <WinTableHead>Date</WinTableHead>
              <WinTableHead>Description</WinTableHead>
              <WinTableHead>Category</WinTableHead>
              <WinTableHead>Amount</WinTableHead>
              <WinTableHead>Method</WinTableHead>
              <WinTableHead>Status</WinTableHead>
              <WinTableHead>Actions</WinTableHead>
            </WinTableHeader>
            <tbody>
              {filteredExpenses.map(e => (
                <tr key={e.id} className="hover:bg-blue-100 italic font-mono text-xs">
                  <WinTableCell>{e.date.split('T')[0]}</WinTableCell>
                  <WinTableCell className="max-w-[200px] truncate">{e.description}</WinTableCell>
                  <WinTableCell>{e.category}</WinTableCell>
                  <WinTableCell className="text-right">${Number(e.amount).toFixed(2)}</WinTableCell>
                  <WinTableCell>{e.payment_method}</WinTableCell>
                  <WinTableCell>{e.status}</WinTableCell>
                  <WinTableCell>
                    <div className="flex gap-2">
                       <button onClick={() => navigate(`/edit/${e.id}`, { state: { expense: e } })} className="hover:text-blue-800"><Edit3 size={12} /></button>
                       <button onClick={() => handleDelete(e.id)} className="hover:text-red-800"><Trash2 size={12} /></button>
                    </div>
                  </WinTableCell>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 italic">No records matching your criteria found in database.</td>
                </tr>
              )}
            </tbody>
          </WinTable>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center mt-2 px-1 gap-2 flex-shrink-0">
            <span className="text-[10px] text-center sm:text-left">Registry Status: {filteredExpenses.length} record(s) loaded</span>
            <WinButton className="w-full sm:w-auto overflow-hidden text-ellipsis whitespace-nowrap" onClick={() => navigate('/add')}>Create New Record...</WinButton>
          </div>
        </div>
      </WinWindow>
    </div>
  );
}
