import React, { useEffect, useState } from 'react';
import { WinWindow, WinInset } from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  PieChart as PieIcon,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
  Legend
} from 'recharts';

interface DetailedData {
  label: string;
  category: string;
  total: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#000080',
  Rent: '#800000',
  Transport: '#008000',
  Utilities: '#808000',
  Fun: '#800080',
  Healthcare: '#008080',
  Shopping: '#808080',
  Other: '#C0C0C0',
  Education: '#4B0082',
  Subscriptions: '#FF4500',
  Insurance: '#2F4F4F',
  Savings: '#006400',
  Gifts: '#DB7093',
  Investment: '#D2691E'
};

const getCategoryColor = (cat: string) => {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  // Simple hash for dynamic colors
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, p: any) => acc + p.value, 0);
    return (
      <div className="bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] p-2 shadow-sm font-mono text-[10px]">
        <p className="font-bold border-b border-[#808080] mb-2 pb-1 text-black">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-4" style={{ color: p.color }}>
              <span>{p.name}:</span>
              <span className="font-bold">${p.value.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-[#808080] mt-1 pt-1 flex justify-between font-bold text-black">
            <span>TOTAL:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { token, user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grain, setGrain] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchDetailed();
    fetchFullExpenses();
  }, [token, year, grain]);

  const fetchFullExpenses = async () => {
    try {
      const response = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        setAllExpenses(json);
      }
    } catch (err) {
      console.error('Failed to fetch full expenses', err);
    }
  };

  const fetchDetailed = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/detailed?year=${year}&grain=${grain}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch detailed data');
      }

      const raw = await response.json();
      
      if (!Array.isArray(raw)) {
        throw new Error('API response is not an array');
      }
      
      // Pivot data for Recharts stacked format
      const pivoted: Record<string, any> = {};
      const cats = new Set<string>();
      
      raw.forEach((item: DetailedData) => {
        if (!pivoted[item.label]) {
          pivoted[item.label] = { label: item.label };
        }
        pivoted[item.label][item.category] = item.total;
        cats.add(item.category);
      });
      
      setData(Object.values(pivoted));
      setCategories(Array.from(cats));
    } catch (err) {
      console.error(err);
      setData([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSpent = data.reduce((acc, curr) => {
    const rowTotal = categories.reduce((rowAcc, cat) => rowAcc + (curr[cat] || 0), 0);
    return acc + rowTotal;
  }, 0);

  // Calculate annual total specifically from allExpenses for the selected year
  const annualExpenses = allExpenses.filter(e => {
    // Robust parsing of YYYY-MM-DD
    const expYear = parseInt(e.date.substring(0, 4));
    return expYear === year;
  });
  
  const annualTotal = annualExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const annualCategories = Array.from(new Set(annualExpenses.map(e => e.category)));

  const handlePrint = () => {
    setIsPreparingPrint(true);
    // Give a small delay to ensure DOM is ready and state is flushed
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 500);
  };

  const grainLabels = {
    day: 'Daily Vector',
    week: 'Weekly Cycles',
    month: 'Monthly Analysis',
    year: 'Annual Trajectory'
  };

  const remainingBalance = (user?.income || 0) - annualTotal;

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
        <WinWindow title="System Busy" className="w-64">
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="animate-spin text-2xl">⏳</div>
                <div className="text-[10px] font-bold text-center uppercase tracking-tighter">
                    Seeking Data Blocks...<br/>
                    Please Wait
                </div>
                <WinInset className="w-48 h-4 bg-white overflow-hidden p-0.5">
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="h-full w-1/3 bg-[#000080]"
                    />
                </WinInset>
            </div>
        </WinWindow>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between print-hidden">
        <div className="flex flex-wrap gap-1 bg-[#808080] p-1 border-2 border-b-white border-r-white border-white max-w-full overflow-x-auto">
            {(['day', 'week', 'month', 'year'] as const).map(g => (
                <button 
                    key={g}
                    onClick={() => setGrain(g)}
                    className={`px-3 py-1 text-[10px] uppercase font-bold transition-all ${
                        grain === g 
                        ? 'bg-[#000080] text-white shadow-inner translate-y-[1px]' 
                        : 'bg-[#C0C0C0] text-black hover:bg-gray-200 shadow-[2px_2px_0px_#fff_inset,-2px_-2px_0px_#444_inset]'
                    }`}
                >
                    {g}
                </button>
            ))}
        </div>

        <div className="flex items-center gap-4 bg-[#C0C0C0] p-1 border-2 border-white border-b-[#808080] border-r-[#808080]">
            <button onClick={() => setYear(year - 1)} className="win-button p-1"><ChevronLeft size={16} /></button>
            <span className="font-bold text-sm px-4 min-w-[80px] text-center">{year}</span>
            <button onClick={() => setYear(year + 1)} className="win-button p-1"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6 print:w-full print:block">
            <div className="break-inside-avoid">
                <WinWindow title={`${grainLabels[grain]} Visualizer`} className="print:shadow-none print:border-black">
                    <div className="h-[400px] w-full bg-white p-4 shadow-inner relative overflow-hidden flex flex-col items-center justify-center">
                        {data.length === 0 ? (
                            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="text-4xl grayscale opacity-50">📁</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    No records indexed for {year}
                                </div>
                                <p className="text-[9px] text-gray-400 border-t border-gray-100 pt-2">Data rendering requires active entries.</p>
                            </div>
                        ) : (
                            <>
                                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                                    <defs>
                                        {categories.map((cat, idx) => (
                                            <linearGradient key={cat} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={getCategoryColor(cat)} stopOpacity={1}/>
                                                <stop offset="95%" stopColor={getCategoryColor(cat)} stopOpacity={0.6}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                </svg>

                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="1 1" stroke="#ccc" vertical={false} />
                                        <XAxis dataKey="label" stroke="#000" fontSize={9} tickLine={true} interval={grain === 'day' ? 2 : 0} />
                                        <YAxis stroke="#000" fontSize={9} axisLine={true} tickFormatter={(val) => `$${val}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend 
                                            wrapperStyle={{ paddingTop: '10px' }} 
                                            formatter={(value) => <span className="text-[9px] font-bold text-black uppercase">{value}</span>}
                                        />
                                        {categories.map((cat, idx) => (
                                            <Bar 
                                                key={cat} 
                                                dataKey={cat} 
                                                stackId="a" 
                                                fill={`url(#grad-${idx})`} 
                                                animationDuration={1000}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </>
                        )}
                    </div>
                </WinWindow>
            </div>

            <div className="break-inside-avoid print:mt-8">
                <WinWindow title="Real-time Metrics" className="print:shadow-none print:border-black">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <WinInset className="bg-white p-4">
                            <div className="text-[10px] text-gray-500 font-bold mb-1">AGGREGATE SUM</div>
                            <div className="text-2xl font-bold text-[#000080]">${totalSpent.toLocaleString()}</div>
                        </WinInset>
                        <WinInset className="bg-white p-4">
                            <div className="text-[10px] text-gray-500 font-bold mb-1">MEAN / {grain.toUpperCase()}</div>
                            <div className="text-2xl font-bold">${(totalSpent / (data.length || 1)).toFixed(2)}</div>
                        </WinInset>
                        <WinInset className="bg-white p-4">
                            <div className="text-[10px] text-gray-500 font-bold mb-1">CATEGORIES TRACED</div>
                            <div className="text-2xl font-bold">{categories.length}</div>
                        </WinInset>
                    </div>
                </WinWindow>
            </div>
        </div>

        {/* Action Sidebar */}
        <div className="lg:col-span-1 space-y-4 print-hidden">
            <WinWindow title="Hardware Controls">
                <div className="space-y-3">
                    <button 
                        onClick={handlePrint}
                        disabled={isPreparingPrint}
                        className="win-button w-full py-2 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isPreparingPrint ? (
                            <span className="animate-pulse">SPOOLING...</span>
                        ) : (
                            <><Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Print Report</>
                        )}
                    </button>
                </div>
            </WinWindow>

            <WinWindow title="Subsystem Status">
                <div className="text-[10px] uppercase space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Database:</span>
                        <span className="bg-green-100 text-green-800 px-1 font-bold">ONLINE</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">G-Processor:</span>
                        <span className="font-bold">ACTIVE (60Hz)</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Buffer:</span>
                        <span className="font-bold">FLUSHED</span>
                    </div>
                </div>
            </WinWindow>

            <WinInset className="bg-[#808080] p-4 text-white text-[9px] font-mono">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span>SYSTEM RUNNING</span>
                </div>
                The reports are calculated based on your stored transactions in the PostgreSQL cluster.
            </WinInset>
        </div>
      </div>
      
      {/* Print-Only Comprehensive Report */}
      <div className="hidden print:block p-8 bg-white text-black font-serif">
          <div className="border-4 border-double border-black p-6 mb-8 text-center">
              <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Comprehensive Financial Statement</h1>
              <div className="text-xl border-t border-black pt-2 inline-block px-12">Fiscal Year {year}</div>
          </div>

          <div className="mb-12 flex justify-between items-end border-b-2 border-black pb-4">
              <div>
                  <div className="text-[10px] font-bold uppercase text-gray-500">Statement Owner</div>
                  <div className="text-lg font-bold">{user?.email}</div>
              </div>
              <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-gray-500">Generated On</div>
                  <div className="text-sm">{new Date().toLocaleString()}</div>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="border border-black p-4 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase mb-1">Total Annual Income</div>
                    <div className="text-2xl font-bold font-mono">${(user?.income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
              </div>
              <div className="border border-black p-4 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase mb-1">Total Annual Saving</div>
                    <div className={`text-2xl font-bold font-mono ${remainingBalance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {remainingBalance < 0 ? '(' : ''}${Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}{remainingBalance < 0 ? ')' : ''}
                    </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-12">
              <div className="border border-black p-4 bg-gray-50">
                  <div className="text-[10px] font-bold uppercase mb-2">Total Annual Expenditure</div>
                  <div className="text-2xl font-bold">${annualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="border border-black p-4 bg-gray-50">
                  <div className="text-[10px] font-bold uppercase mb-2">Categories Analyzed</div>
                  <div className="text-2xl font-bold">{annualCategories.length}</div>
              </div>
              <div className="border border-black p-4 bg-gray-50">
                  <div className="text-[10px] font-bold uppercase mb-2">Avg. Monthly Burn</div>
                  <div className="text-2xl font-bold">${(annualTotal / 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
          </div>

          <h2 className="text-xl font-bold uppercase border-b border-black mb-6">Annual Performance Matrix</h2>
          <div className="mb-8">
              <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                      <tr className="bg-gray-100 uppercase text-[10px]">
                          <th className="p-2 border border-black text-left">Month</th>
                          <th className="p-2 border border-black text-right">Transaction Count</th>
                          <th className="p-2 border border-black text-right">Monthly Expenditure</th>
                          <th className="p-2 border border-black text-right">% of Annual</th>
                      </tr>
                  </thead>
                  <tbody>
                      {Array.from({ length: 12 }, (_, i) => i).map(monthIdx => {
                          const mExpenses = allExpenses.filter(e => {
                              const expYear = parseInt(e.date.substring(0, 4));
                              const expMonth = parseInt(e.date.substring(5, 7)) - 1;
                              return expYear === year && expMonth === monthIdx;
                          });
                          if (mExpenses.length === 0) return null;
                          const mTotal = mExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
                          const monthName = new Date(year, monthIdx).toLocaleString('default', { month: 'long' });
                          return (
                              <tr key={monthIdx}>
                                  <td className="p-2 border border-black font-bold">{monthName}</td>
                                  <td className="p-2 border border-black text-right">{mExpenses.length}</td>
                                  <td className="p-2 border border-black text-right font-mono">${mTotal.toFixed(2)}</td>
                                  <td className="p-2 border border-black text-right">{((mTotal / annualTotal) * 100).toFixed(1)}%</td>
                              </tr>
                          );
                      })}
                      <tr className="bg-gray-50 font-bold">
                          <td className="p-2 border border-black uppercase text-right" colSpan={2}>Grand Total</td>
                          <td className="p-2 border border-black text-right font-mono text-lg">${annualTotal.toFixed(2)}</td>
                          <td className="p-2 border border-black text-right">100%</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          <h2 className="text-xl font-bold uppercase border-b border-black mb-6 mt-12">Detailed Transaction Journals</h2>
          
          {Array.from({ length: 12 }, (_, i) => i).map(monthIdx => {
              const monthName = new Date(year, monthIdx).toLocaleString('default', { month: 'long' });
              const monthExpenses = allExpenses.filter(e => {
                  const expYear = parseInt(e.date.substring(0, 4));
                  const expMonth = parseInt(e.date.substring(5, 7)) - 1;
                  return expYear === year && expMonth === monthIdx;
              }).sort((a, b) => a.date.localeCompare(b.date));

              if (monthExpenses.length === 0) return null;

              const monthTotal = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

              return (
                  <div key={monthIdx} className="mb-10 break-inside-avoid">
                      <div className="flex justify-between items-center border-b border-gray-300 mb-2">
                          <h3 className="text-lg font-bold uppercase">{monthName}</h3>
                          <span className="font-bold">Subtotal: ${monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <table className="w-full text-sm border-collapse">
                          <thead>
                              <tr className="bg-gray-100 border-b border-black text-left">
                                  <th className="py-1 px-2 border border-gray-300">Date</th>
                                  <th className="py-1 px-2 border border-gray-300">Category</th>
                                  <th className="py-1 px-2 border border-gray-300">Description</th>
                                  <th className="py-1 px-2 border border-gray-300 text-right">Amount</th>
                              </tr>
                          </thead>
                          <tbody>
                              {monthExpenses.map(exp => (
                                  <tr key={exp.id} className="border-b border-gray-200">
                                      <td className="py-1 px-2 border border-gray-300 w-24">{new Date(exp.date).toLocaleDateString()}</td>
                                      <td className="py-1 px-2 border border-gray-300 w-32">{exp.category}</td>
                                      <td className="py-1 px-2 border border-gray-300">{exp.description || '---'}</td>
                                      <td className="py-1 px-2 border border-gray-300 text-right font-mono">${parseFloat(exp.amount).toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              );
          })}

          <div className="mt-20 border-t-2 border-black pt-4 text-center text-[10px] text-gray-500 uppercase tracking-[0.2em]">
              End of Financial Statement - AI Studio Wind95 Expense Tracker
          </div>
      </div>
    </motion.div>
  );
}
