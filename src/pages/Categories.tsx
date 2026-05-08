import React, { useEffect, useState } from 'react';
import { WinWindow, WinTable, WinTableHeader, WinTableHead, WinTableCell, WinInset } from '../components/RetroUI';
import { useAuth } from '../hooks/useAuth';
import { Tags, PieChart, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryStat {
  category: string;
  count: number;
  total_amount: number;
  percentage: number;
}

const CATEGORY_COLORS = [
  '#000080', '#800000', '#008000', '#808000', 
  '#800080', '#008080', '#808080', '#C0C0C0'
];

export default function Categories() {
  const { token } = useAuth();
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, customRes] = await Promise.all([
        fetch('/api/categories/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (!statsRes.ok || !customRes.ok) throw new Error('Failed to fetch data');
      
      setStats(await statsRes.json());
      setCustomCategories(await customRes.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustom = async (name: string) => {
    if (!confirm(`Are you sure you want to remove the custom category "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/categories/${name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-8 text-white">Loading Category Analytics...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* All Categories Table */}
        <div className="space-y-4">
          <WinWindow title="Category Index" className="h-fit">
            <div className="flex items-center gap-2 mb-3 text-sm font-bold">
              <Tags size={16} /> List of Active Categories
            </div>
            <WinTable>
              <WinTableHeader>
                <WinTableHead>Category Name</WinTableHead>
                <WinTableHead>Usage Count</WinTableHead>
                <WinTableHead>Total Spent</WinTableHead>
              </WinTableHeader>
              <tbody>
                {stats.length === 0 ? (
                  <tr>
                    <WinTableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No data recorded. Start adding expenses to see categories.
                    </WinTableCell>
                  </tr>
                ) : (
                  stats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-[#000080] hover:text-white group">
                      <WinTableCell className="font-bold">{stat.category}</WinTableCell>
                      <WinTableCell>{stat.count} times</WinTableCell>
                      <WinTableCell>${stat.total_amount.toFixed(2)}</WinTableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </WinTable>
          </WinWindow>

          {customCategories.length > 0 && (
            <WinWindow title="Custom Category Registry" className="h-fit">
               <div className="text-xs font-bold mb-2 uppercase text-gray-600">User-Defined Category Tags</div>
               <div className="flex flex-wrap gap-2">
                 {customCategories.map(cat => (
                   <div key={cat} className="win-inset bg-white px-2 py-1 text-[11px] font-bold flex items-center gap-2 shadow-sm">
                     {cat}
                     <button 
                       onClick={() => handleDeleteCustom(cat)}
                       className="hover:text-red-700 font-mono text-[10px] leading-none text-gray-400"
                       title="Delete Category"
                     >
                       ×
                     </button>
                   </div>
                 ))}
               </div>
            </WinWindow>
          )}
        </div>

        {/* Most Used Categories (Percentage breakdown) */}
        <WinWindow title="Spending Distribution" className="h-fit">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold">
            <PieChart size={16} /> Category Expense Weight (by Total Amount)
          </div>
          
          <div className="space-y-4">
            {stats.length === 0 ? (
              <div className="win-inset bg-white p-8 text-center text-gray-400 italic">
                Data missing. Analytics unavailable.
              </div>
            ) : (
              stats.map((stat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold px-1">
                    <span>{stat.category}</span>
                    <span>{stat.percentage}% (${stat.total_amount.toFixed(2)})</span>
                  </div>
                  <WinInset className="h-5 bg-white flex overflow-hidden">
                    <div 
                      className="h-full border-r border-[#808080]" 
                      style={{ 
                        width: `${stat.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                      }}
                    />
                  </WinInset>
                </div>
              ))
            )}
          </div>

          {stats.length > 0 && (
            <div className="mt-6 border-t border-gray-400 pt-4 flex items-center gap-2 text-xs text-gray-600">
              <TrendingUp size={14} /> Relative financial impact based on ${stats.reduce((acc, s) => acc + s.total_amount, 0).toFixed(2)} total recorded capital.
            </div>
          )}
        </WinWindow>
      </div>
      
      {/* Summary Box */}
      <WinWindow title="Analytics Summary">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="win-inset bg-white p-4 flex-1">
                <div className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">Top Category</div>
                <div className="text-xl md:text-2xl font-bold text-[#000080]">
                    {stats[0]?.category || 'N/A'}
                </div>
            </div>
            <div className="win-inset bg-white p-4 flex-1">
                <div className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">Unique Categories</div>
                <div className="text-xl md:text-2xl font-bold">
                    {stats.length}
                </div>
            </div>
            <div className="win-inset bg-white p-4 flex-1">
                <div className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">Highest Spend</div>
                <div className="text-xl md:text-2xl font-bold text-red-700">
                    ${Math.max(...stats.map(s => s.total_amount), 0).toFixed(2)}
                </div>
            </div>
        </div>
      </WinWindow>
    </motion.div>
  );
}
