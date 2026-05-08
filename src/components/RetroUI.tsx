import React from 'react';
import { X, Minimize2, Square } from 'lucide-react';

interface WindowProps {
  title: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export const WinWindow: React.FC<WindowProps> = ({ title, children, width = "auto", className = "" }) => {
  return (
    <div className={`win-outset flex flex-col max-w-full overflow-hidden ${className}`} style={{ width: width !== 'auto' ? width : undefined }}>
      <div className="win-title-bar">
        <span className="win-title-bar-text">{title}</span>
        <div className="win-title-bar-controls">
          <div className="win-control-button"><Minimize2 size={10} /></div>
          <div className="win-control-button"><Square size={10} /></div>
          <div className="win-control-button ml-0.5"><X size={10} /></div>
        </div>
      </div>
      <div className="p-4 flex-grow">
        {children}
      </div>
    </div>
  );
};

export const WinButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...props }) => {
  return (
    <button className={`win-button ${className}`} {...props}>
      {children}
    </button>
  );
};

export const WinInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => {
  return (
    <input className={`win-input ${className}`} {...props} />
  );
};

export const WinSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = "", ...props }) => {
  return (
    <select className={`win-input ${className}`} {...props}>
      {children}
    </select>
  );
};

export const WinTable: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`win-inset bg-white overflow-auto ${className}`}>
      <table className="w-full border-collapse border-spacing-0 text-sm">
        {children}
      </table>
    </div>
  );
};

export const WinTableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <thead className="bg-[#c0c0c0] sticky top-0">
      <tr>{children}</tr>
    </thead>
  );
};

export const WinTableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <th className="win-outset text-left px-2 py-1 font-normal whitespace-nowrap">
      {children}
    </th>
  );
};

export const WinTableCell: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  return (
    <td className={`px-2 py-1 border-r border-b border-gray-300 ${className}`}>
      {children}
    </td>
  );
};

export const WinInset: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`win-inset ${className}`}>
      {children}
    </div>
  );
};
