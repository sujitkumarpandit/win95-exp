import React, { useEffect, useState } from 'react';
import { WinWindow, WinInset } from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';
import { Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { user, token, updateUser } = useAuth();
  const [incomeInput, setIncomeInput] = useState('');
  const [incomeDesc, setIncomeDesc] = useState('');
  const [isUpdatingIncome, setIsUpdatingIncome] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<Partial<Expense>>({});

  useEffect(() => {
    // We don't overwrite incomeInput anymore directly with user.income 
    // because it's now an "Amount to Add" field
  }, [user?.income]);

  const [incomeTransactions, setIncomeTransactions] = useState<{id: number, amount: number, description: string, date: string}[]>([]);
  const [showIncomeHistory, setShowIncomeHistory] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [editIncomeAmount, setEditIncomeAmount] = useState('');
  const [editIncomeDesc, setEditIncomeDesc] = useState('');

  const fetchIncomeHistory = async () => {
    try {
      const res = await fetch('/api/income', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setIncomeTransactions(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncomeHistory();
  }, [token]);

  const handleUpdateIncome = async (id: number) => {
    try {
      const response = await fetch(`/api/income/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount: parseFloat(editIncomeAmount), description: editIncomeDesc })
      });
      if (response.ok) {
        const json = await response.json();
        updateUser({ income: json.income });
        setEditingIncomeId(null);
        fetchIncomeHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [confirmingExpenseId, setConfirmingExpenseId] = useState<number | null>(null);
  const [confirmingIncomeId, setConfirmingIncomeId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const getFilteredTotals = () => {
    const now = new Date();
    const startOfRange = new Date();
    
    if (timeRange === 'all') {
      startOfRange.setFullYear(1970, 0, 1);
    } else if (timeRange === 'week') {
      // Start of current week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfRange.setDate(diff);
      startOfRange.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      // Start of current month
      startOfRange.setDate(1);
      startOfRange.setHours(0, 0, 0, 0);
    } else {
      // Start of current year
      startOfRange.setMonth(0, 1);
      startOfRange.setHours(0, 0, 0, 0);
    }

    const filteredExpenses = expenses.filter(e => new Date(e.date) >= startOfRange);
    const filteredIncomes = incomeTransactions.filter(tx => new Date(tx.date) >= startOfRange);

    const expTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const incTotal = filteredIncomes.reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    // Calculate average daily burn
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const avgDaily = expTotal / days;

    return {
      credits: incTotal,
      debits: expTotal,
      net: incTotal - expTotal,
      avgDaily,
      count: filteredExpenses.length
    };
  };

  const currentPeriodStats = getFilteredTotals();

  const handleDeleteIncome = async (id: number) => {
    try {
      const response = await fetch(`/api/income/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        updateUser({ income: json.income });
        setConfirmingIncomeId(null);
        fetchIncomeHistory();
      }
    } catch (err) {
      console.error('Income delete error:', err);
    }
  };

  const handleAddIncome = async (specificAmount?: number) => {
    const amount = specificAmount !== undefined ? specificAmount : parseFloat(incomeInput);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsUpdatingIncome(true);
    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount, description: specificAmount !== undefined ? `Add $${amount.toLocaleString()}` : (incomeDesc || 'Manual Credit') })
      });
      if (response.ok) {
        const json = await response.json();
        updateUser({ income: json.income });
        if (specificAmount === undefined) {
          setIncomeInput('');
          setIncomeDesc('');
        }
        fetchIncomeHistory();
      }
    } catch (err) {
      console.error('Failed to add income', err);
    } finally {
      setIsUpdatingIncome(false);
    }
  };


  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [token]);

  const handleUpdateExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(editExpenseData)
      });
      if (response.ok) {
        setEditingExpenseId(null);
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setConfirmingExpenseId(null);
        fetchExpenses();
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const total = expenses.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const annualExpenses = expenses
    .filter(e => new Date(e.date).getFullYear() === currentYear)
    .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);

  const monthlyExpenses = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);

  const netPosition = (user?.income || 0) - total;
  const utilizationRate = user?.income ? (total / user.income) * 100 : 0;
  
  const categorySummary = expenses.reduce((acc: Record<string, number>, e: Expense) => {
    const amount = Number(e.amount);
    const current = acc[e.category] || 0;
    acc[e.category] = current + amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categorySummary).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Stats */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WinWindow title="Total Expenditure" className="h-full">
              <div className="win-inset bg-white p-4 text-center my-4">
                <h2 className="text-4xl font-bold tracking-tight">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <p className="text-xs text-center text-gray-600 italic">Total value of all tracked records</p>
            </WinWindow>

            <WinWindow title="Top Categories">
               <div className="grid grid-cols-2 gap-2">
                 {sortedCategories.slice(0, 6).map(([cat, amt]) => (
                   <div key={cat} className="win-inset p-2 bg-white flex flex-col items-center">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">{cat}</span>
                     <span className="text-lg font-bold">${amt.toLocaleString()}</span>
                   </div>
                 ))}
                 {sortedCategories.length === 0 && <div className="col-span-full py-4 text-center text-gray-500 italic">No data yet</div>}
               </div>
            </WinWindow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WinWindow title="Recent Activity">
              <div className="flex flex-col gap-0.5 max-h-[350px] overflow-y-auto bg-white win-inset">
                <div className="flex bg-[#c0c0c0] px-2 py-1 border-b border-gray-400 sticky top-0 z-10 text-[9px] font-bold uppercase text-gray-700 shadow-sm gap-2">
                   <span className="w-2/5">Transaction Detail</span>
                   <span className="w-1/4">Category</span>
                   <span className="w-1/3 text-right">Value</span>
                </div>
                {expenses.slice(0, 20).map(e => (
                  <div key={e.id} className="border-b border-gray-100 text-[11px] py-1.5 px-2 hover:bg-blue-50/50 group">
                    {editingExpenseId === e.id ? (
                      <div className="space-y-1.5 p-2 bg-blue-50 border border-blue-200 my-1">
                        <div className="flex flex-col gap-1">
                           <label className="text-[8px] uppercase font-bold text-blue-800">Description</label>
                           <input 
                             type="text" 
                             value={editExpenseData.description} 
                             onChange={ev => setEditExpenseData({...editExpenseData, description: ev.target.value})}
                             className="w-full win-inset px-1 py-0.5 text-[10px]"
                           />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[8px] uppercase font-bold text-blue-800">Amount ($)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={editExpenseData.amount} 
                              onChange={ev => setEditExpenseData({...editExpenseData, amount: parseFloat(ev.target.value)})}
                              className="w-full win-inset px-1 py-0.5 text-[10px] font-mono"
                            />
                          </div>
                          <div className="flex items-end gap-1">
                            <button onClick={() => handleUpdateExpense(e.id)} className="win-button px-2 py-1 text-[9px] font-bold">OK</button>
                            <button onClick={() => setEditingExpenseId(null)} className="win-button px-2 py-1 text-[9px] font-bold">CANCEL</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2/5 flex flex-col min-w-0">
                           <span className="text-gray-900 font-bold truncate tracking-tight">{e.description}</span>
                           <span className="text-[8px] text-gray-400 font-mono">{new Date(e.date).toLocaleDateString()}</span>
                        </div>
                        <div className="w-1/4">
                           <span className="inline-block px-1.5 py-0.5 bg-gray-200 border border-gray-300 text-[8px] text-gray-600 font-bold uppercase rounded-sm">
                             {e.category}
                           </span>
                        </div>
                        <div className="w-1/3 flex flex-col items-end">
                           <span className="font-bold text-red-700 font-mono tracking-tighter">-${Number(e.amount).toFixed(2)}</span>
                           <div className="flex gap-2 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                              {confirmingExpenseId === e.id ? (
                                <div className="flex gap-1.5 items-center bg-red-50 px-1 border border-red-200">
                                  <span className="text-[7px] font-black text-red-600 uppercase">Sure?</span>
                                  <button onClick={() => handleDeleteExpense(e.id)} className="text-red-700 font-black text-[9px] hover:underline">YES</button>
                                  <button onClick={() => setConfirmingExpenseId(null)} className="text-gray-500 font-bold text-[9px] hover:underline">NO</button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingExpenseId(e.id);
                                      setEditExpenseData(e);
                                    }} 
                                    className="text-blue-700 hover:underline text-[9px] font-bold italic p-0.5"
                                    title="Edit Record"
                                  >
                                    UPDATE
                                  </button>
                                  <button 
                                    onClick={() => setConfirmingExpenseId(e.id)} 
                                    className="text-red-700 hover:underline text-[9px] font-bold italic p-0.5"
                                    title="Delete Record"
                                  >
                                    REMOVE
                                  </button>
                                </>
                              )}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {expenses.length === 0 && <div className="text-center py-10 text-gray-400 italic text-[10px] uppercase font-bold">Database empty. awaiting entry...</div>}
              </div>
            </WinWindow>

            <WinWindow title="Financial Summary">
               <div className="flex flex-col h-full bg-[#c0c0c0]">
                 <div className="flex p-1.5 border-b border-gray-400 gap-1 bg-[#dfdfdf] shadow-[inset_1px_1px_0_white]">
                    {(['week', 'month', 'year', 'all'] as const).map(range => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`win-button px-3 py-1 text-[8px] font-black uppercase transition-all ${
                          timeRange === range ? 'bg-white shadow-[inset_1px_1px_0px_rgba(0,0,0,1)]' : ''
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                 </div>

                 <div className="bg-white p-4 win-inset m-2 space-y-4 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-[#000080] uppercase tracking-widest flex items-center gap-2">
                             <span className="w-2 h-2 bg-[#000080] animate-pulse"></span>
                             Balance Audit
                          </span>
                          <span className="text-[7px] text-gray-400 font-mono font-bold">MODE: REAL_TIME_{timeRange.toUpperCase()}</span>
                       </div>
                       <div className="text-right flex flex-col">
                          <span className="text-[10px] font-mono font-black text-gray-600">DATA_SYNC_OK</span>
                          <span className="text-[7px] text-gray-400 uppercase font-bold">Cluster_04</span>
                       </div>
                    </div>

                    <div className="h-[145px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'INCOME', value: currentPeriodStats.credits, fill: '#0088FE', id: 'in', label: 'Total Income' },
                            { name: 'EXPENSES', value: currentPeriodStats.debits, fill: '#FF3333', id: 'out', label: 'Total Expenses' },
                            { name: 'SAVINGS', value: Math.max(0, currentPeriodStats.net), fill: '#22C55E', id: 'sav', label: 'Net Savings' }
                          ]}
                          margin={{ top: 20, right: 10, left: -15, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="" stroke="#cccccc" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={{ stroke: '#000', strokeWidth: 1 }} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 'bold', fill: '#000' }} 
                            dy={5}
                          />
                          <YAxis 
                            axisLine={{ stroke: '#000', strokeWidth: 1 }} 
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#000' }}
                            tickFormatter={(v) => v.toString()}
                          />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-black p-2 shadow-md">
                                    <div className="text-[9px] font-bold uppercase text-gray-500 border-b border-gray-100 pb-1 mb-1">
                                      {data.name}
                                    </div>
                                    <div className="text-[14px] font-black font-mono text-gray-900">
                                      ${Number(data.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            barSize={50}
                            isAnimationActive={true}
                            animationDuration={800}
                          >
                            { [
                                { fill: '#0088FE' },
                                { fill: '#FF3333' },
                                { fill: '#22C55E' }
                              ].map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.fill}
                                />
                              ))
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-4 border-y border-gray-100 py-2">
                       {[
                         { label: 'INCOME', color: '#0088FE' },
                         { label: 'EXPENSES', color: '#FF3333' },
                         { label: 'SAVINGS', color: '#22C55E' }
                       ].map(item => (
                         <div key={item.label} className="flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 border border-white shadow-[1px_1px_0px_rgba(0,0,0,0.2)]" style={{ backgroundColor: item.color }}></div>
                           <span className="text-[7px] font-black text-gray-500 tracking-tighter">{item.label}</span>
                         </div>
                       ))}
                    </div>

                    <div className="pt-2 flex justify-between items-end">
                       <div className="space-y-0.5">
                          <div className="text-[8px] font-black text-gray-400 uppercase tracking-tight">System Status</div>
                          <div className={`text-[10px] font-black uppercase flex items-center gap-1 ${currentPeriodStats.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                             {currentPeriodStats.net >= 0 ? (
                               <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.5)]"></span> SOLVENT</>
                             ) : (
                               <><span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_4px_rgba(220,38,38,0.5)]"></span> ALERT</>
                             )}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-[8px] font-black text-gray-400 uppercase tracking-tight">Net Capital</div>
                          <div className={`text-[14px] font-black font-mono tracking-tighter ${currentPeriodStats.net >= 0 ? 'text-gray-900' : 'text-red-800'}`}>
                            {currentPeriodStats.net < 0 ? '-' : ''}${Math.abs(currentPeriodStats.net).toLocaleString()}
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
            </WinWindow>
          </div>
        </div>

        {/* Wealth Manager Sidebar */}
        <div className="lg:col-span-1">
          <WinWindow title="Wealth Manager">
              <div className="space-y-4">
                  {/* Income Setting Section */}
                  <div className="border border-gray-400 p-3 pt-5 relative mt-3 bg-gray-200/50 shadow-[1px_1px_0_white]">
                       <div className="absolute -top-2.5 left-2 bg-[#c0c0c0] px-1.5 text-[9px] uppercase font-black text-gray-600 tracking-widest border-x border-[#c0c0c0]">
                         Log Wealth Entry
                       </div>
                       
                       <div className="space-y-3">
                          <div className="space-y-1">
                              <label className="text-[8px] uppercase text-gray-500 font-black ml-1.5 tracking-tighter">Transaction Source</label>
                              <div className="relative">
                                <input 
                                    type="text" 
                                    value={incomeDesc}
                                    onChange={(e) => setIncomeDesc(e.target.value)}
                                    className="win-inset bg-white px-2.5 py-1.5 w-full text-[11px] focus:outline-none placeholder:text-gray-300 font-medium"
                                    placeholder="e.g. Monthly Salary, Gift..."
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-200 pointer-events-none">✎</div>
                              </div>
                          </div>
                          
                          <div className="space-y-1">
                             <label className="text-[8px] uppercase text-gray-500 font-black ml-1.5 tracking-tighter">Amount (Currency: USD)</label>
                             <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                  <input 
                                      type="number" 
                                      value={incomeInput}
                                      onChange={(e) => setIncomeInput(e.target.value)}
                                      className="win-inset bg-white px-2 py-1.5 w-full text-[12px] font-bold font-mono focus:outline-none"
                                      placeholder="0.00"
                                  />
                                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-300 text-[10px] hidden">$</span>
                                </div>
                                <button 
                                    onClick={() => handleAddIncome()}
                                    disabled={isUpdatingIncome}
                                    className="win-button px-3 py-1 text-[10px] uppercase font-black min-w-[75px] bg-[#d4d4d4] hover:bg-[#e0e0e0] active:translate-y-0.5 transition-transform"
                                >
                                    {isUpdatingIncome ? '...' : 'COMMIT +'}
                                </button>
                             </div>
                          </div>
                          
                          <div className="pt-1">
                            <div className="text-[7.5px] uppercase text-gray-400 font-black mb-1.5 ml-1">Quick Increments</div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[1000, 5000, 10000].map(val => (
                                <button 
                                  key={val}
                                  onClick={() => handleAddIncome(val)}
                                  className="win-button text-[10px] py-1.5 font-black bg-gray-100 hover:text-green-700 transition-colors"
                                  title={`Append $${val.toLocaleString()} to global balance`}
                                >
                                  +${val/1000}k
                                </button>
                              ))}
                            </div>
                          </div>
                       </div>
                  </div>

                  {/* Financial Graph / Status Summary Section */}
                  <div className="border border-gray-400 p-3 pt-4 relative mt-2 bg-gray-200/50">
                    <div className="absolute -top-2 left-2 bg-[#c6c6c6] px-1 text-[9px] uppercase font-bold text-gray-700 tracking-tight">
                      {showIncomeHistory ? 'Balance Sheet' : 'Fiscal Health'}
                    </div>

                    <div className="flex justify-between items-end text-[9px] uppercase font-bold text-gray-600 mb-3 px-1">
                      <button 
                        onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                        className="win-button px-2 py-0.5 text-[8px] bg-white hover:bg-gray-100 font-bold"
                      >
                        {showIncomeHistory ? 'BACK' : 'HISTORY'}
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="text-[7px] text-gray-400 font-mono uppercase">Liability Index</span>
                        <span className={`font-mono font-black ${netPosition >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
                          {utilizationRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {showIncomeHistory ? (
                      <WinInset className="max-h-[250px] overflow-y-auto bg-white p-0 text-[10px]">
                        <div className="flex bg-[#000080] px-2 py-1 text-[8px] font-bold uppercase text-white sticky top-0 z-10">
                           <span className="w-1/2">Transaction Source</span>
                           <span className="w-1/2 text-right px-1">Credit Amt</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {incomeTransactions.map(tx => (
                            <div key={tx.id} className="p-1 px-2 hover:bg-green-50 group">
                              {editingIncomeId === tx.id ? (
                                <div className="space-y-1.5 p-1 bg-yellow-50 border border-yellow-200 my-0.5">
                                  <input 
                                    type="text" 
                                    value={editIncomeDesc} 
                                    onChange={e => setEditIncomeDesc(e.target.value)}
                                    className="w-full win-inset px-1 py-0.5 text-[9px]"
                                  />
                                  <div className="flex gap-1">
                                    <input 
                                      type="number" 
                                      value={editIncomeAmount}
                                      onChange={e => setEditIncomeAmount(e.target.value)}
                                      className="flex-1 win-inset px-1 py-0.5 text-[9px] font-mono"
                                    />
                                    <button onClick={() => handleUpdateIncome(tx.id)} className="win-button px-1 text-[8px] font-bold uppercase">SET</button>
                                    <button onClick={() => setEditingIncomeId(null)} className="win-button px-1 text-[8px] font-bold uppercase">ESC</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center py-0.5">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold truncate text-[10px] text-gray-800 tracking-tight">{tx.description}</span>
                                    <span className="text-[7px] text-gray-400 font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-green-700 font-black text-[11px] tracking-tighter shrink-0">+${Number(tx.amount).toFixed(2)}</span>
                                    <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-all">
                                      {confirmingIncomeId === tx.id ? (
                                        <div className="flex gap-1.5 items-center bg-red-50 px-1 border border-red-100 scale-90">
                                          <button onClick={() => handleDeleteIncome(tx.id)} className="text-red-700 font-black text-[10px]">✔</button>
                                          <button onClick={() => setConfirmingIncomeId(null)} className="text-gray-400 font-bold text-[10px]">✘</button>
                                        </div>
                                      ) : (
                                        <>
                                          <button 
                                            onClick={() => {
                                              setEditingIncomeId(tx.id);
                                              setEditIncomeAmount(tx.amount.toString());
                                              setEditIncomeDesc(tx.description);
                                            }} 
                                            className="text-blue-700 font-black hover:scale-125 transition-transform"
                                          >
                                            ✎
                                          </button>
                                          <button 
                                            onClick={() => setConfirmingIncomeId(tx.id)} 
                                            className="text-red-700 font-black hover:scale-125 transition-transform"
                                          >
                                            ×
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {incomeTransactions.length === 0 && <div className="text-center py-8 text-gray-400 italic text-[9px] uppercase font-bold">No income logged.</div>}
                      </WinInset>
                    ) : (
                      <>
                        <div className="win-inset h-6 bg-white p-0.5 relative overflow-hidden mb-4 border-gray-400">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] ${netPosition >= 0 ? 'bg-[#000080]' : 'bg-red-800'}`}
                            style={{ width: `${Math.min(100, utilizationRate)}%` }}
                          >
                            <div className="w-full h-full opacity-40 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-pulse"></div>
                          </div>
                          {netPosition < 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[7px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md animate-pulse">CAPITAL_DEFICIT</span>
                            </div>
                          )}
                        </div>

                        <div className="win-inset bg-white p-0.5 overflow-hidden shadow-inner border-gray-400">
                          <div className="bg-[#000080] p-1 px-2 flex justify-between items-center shadow-md">
                            <span className="text-[9px] text-white font-black uppercase tracking-widest">Master Audit Ledger</span>
                            <span className="text-[8px] text-blue-200 font-mono italic opacity-80">VER:{currentYear}</span>
                          </div>
                          <div className="p-3 bg-white space-y-3 font-mono">
                            <div className="flex justify-between items-baseline group hover:bg-gray-50 transition-colors px-1">
                              <div className="text-[8px] uppercase font-black text-gray-400">Lifetime_Credits</div>
                              <div className="text-[11px] font-black text-gray-900">
                                ${ (user?.income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-baseline group hover:bg-gray-50 transition-colors px-1">
                              <div className="text-[8px] uppercase font-black text-gray-400">Lifetime_Debits</div>
                              <div className="text-[11px] font-black text-red-600">
                                -${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>

                            <div className="border-t border-gray-300 border-dotted my-1 mx-1"></div>

                            <div className="flex justify-between items-center pt-1 px-1 bg-gray-50/50 p-1.5 border border-gray-100 rounded-sm">
                              <div className="text-[9px] uppercase font-black text-gray-700 tracking-tighter">Net_Capital_Position</div>
                              <div className={`text-sm font-black tracking-tighter ${netPosition >= 0 ? 'text-green-600' : 'text-red-700'}`}>
                                {netPosition < 0 ? '-' : ''}${Math.abs(netPosition).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="win-inset bg-white p-1.5 px-2 flex justify-between items-center text-[9px] uppercase font-bold shadow-inner">
                    <span className="text-gray-500">Current Standing:</span>
                    <span className={netPosition >= 0 ? 'text-green-700' : 'text-red-700 flex items-center gap-1'}>
                      {netPosition >= 0 ? (
                        'SOLVENT'
                      ) : (
                        <>
                          <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                          BANKRUPTCY_RISK
                        </>
                      )}
                    </span>
                  </div>
              </div>
          </WinWindow>
        </div>
      </div>
    </div>
  );
}
