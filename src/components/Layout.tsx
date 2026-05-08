import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  List, 
  PlusSquare, 
  Tags, 
  BarChart3, 
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { WinButton } from './RetroUI';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Menu Bar */}
      <div className="win-gray bg-[#c0c0c0] border-b-2 border-white flex items-center px-2 py-1 md:py-0.5 gap-2 text-sm print-hidden">
        <div className="flex items-center gap-1 md:gap-2 px-1 min-w-0">
          <div className="bg-[#000080] p-1 shadow-[1px_1px_0_white] hidden sm:block">
            <PlusSquare size={16} className="text-white" />
          </div>
          <span className="font-black italic tracking-tighter text-[#000080] text-sm md:text-base truncate">EXPENSE_MANAGE_v1.0</span>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] md:text-xs italic hidden sm:inline truncate max-w-[150px]">User: {user?.email}</span>
          <button onClick={handleLogout} className="win-button text-xs py-0 px-2 whitespace-nowrap">Logout</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-64 win-outset m-1 flex md:flex-col gap-2 p-2 print-hidden overflow-x-auto md:overflow-visible flex-shrink-0">
           <div className="hidden md:flex win-inset bg-[#808080] text-white px-2 py-1 items-center gap-2 font-bold text-sm">
             <LayoutDashboard size={14} /> Navigate
           </div>
           
           <nav className="flex md:flex-col gap-2">
             <SidebarItem to="/" icon={<LayoutDashboard size={16} />} label="Dashboard" />
             <SidebarItem to="/expenses" icon={<List size={16} />} label="Expenses List" />
             <SidebarItem to="/add" icon={<PlusSquare size={16} />} label="Add New Expense" />
             <SidebarItem to="/categories" icon={<Tags size={16} />} label="Categories" />
             <SidebarItem to="/reports" icon={<BarChart3 size={16} />} label="Reports" />
             <div className="hidden md:block border-b border-gray-400 my-1"></div>
             <SidebarItem to="/help" icon={<HelpCircle size={16} />} label="Help" />
           </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-2">
          {children}
        </main>
      </div>
      
      {/* Status Bar */}
      <div className="win-inset bg-[#c0c0c0] text-[11px] px-2 py-0.5 flex gap-2 md:gap-4 mt-auto print-hidden">
        <div className="flex-1 truncate">Ready</div>
        <div className="border-l border-gray-400 px-2 w-16 md:w-32 uppercase hidden sm:block">Num</div>
        <div className="border-l border-gray-400 px-2 w-16 md:w-32 uppercase hidden sm:block">Caps</div>
      </div>
    </div>
  );
}

function SidebarItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `win-button md:w-full w-auto whitespace-nowrap justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 text-xs md:text-sm flex-shrink-0 ${isActive ? 'win-inset bg-[#d4d4d4]' : ''}`
      }
    >
      {icon} <span className="hidden md:inline">{label}</span><span className="md:hidden">{label.split(' ')[0]}</span>
    </NavLink>
  );
}
