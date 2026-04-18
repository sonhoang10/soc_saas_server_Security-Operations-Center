import React from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

// 1. NÚT BẤM TỔNG HỢP (Primary, Outline, Ghost, Danger)
export const Button = ({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  onClick, 
  className = "", 
  isLoading = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-[#3ecf8e] text-[#1c1c1c] hover:brightness-110 shadow-[0_0_15px_rgba(62,207,142,0.2)]',
    outline: 'border border-[#3e3e3e] text-[#ededed] hover:bg-[#2a2a2a]',
    ghost: 'text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]/50',
    danger: 'bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20 hover:bg-[#f87171]/20',
  };

  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
        font-bold text-sm transition-all duration-200 disabled:opacity-50
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={18} /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// 2. THANH TÌM KIẾM (Search Input)
export const SearchInput = ({ placeholder = "Search...", value, onChange, className = "" }) => (
  <div className={`relative w-full ${className}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={16} />
    <input 
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-10 pr-4 py-2 text-sm text-[#ededed] focus:outline-none focus:border-[#3ecf8e] transition-all"
    />
  </div>
);

// 3. DROPDOWN SELECT (Custom Styled)
export const Select = ({ options = [], defaultValue, onChange, label, className = "" }) => (
  <div className={`relative ${className}`}>
    <select 
      defaultValue={defaultValue}
      onChange={onChange}
      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg pl-3 pr-8 py-2 text-sm text-[#ededed] appearance-none cursor-pointer focus:outline-none focus:border-[#3ecf8e] transition-all"
    >
      {label && <option disabled>{label}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#a0a0a0]">
      <ChevronDown size={14} />
    </div>
  </div>
);

// 4. BADGE (Nhãn trạng thái: Live, Critical, Resolved...)
export const Badge = ({ children, status = 'info' }) => {
  const styles = {
    success: 'bg-[#3ecf8e]/10 text-[#3ecf8e]',
    error: 'bg-[#f87171]/10 text-[#f87171]',
    warning: 'bg-[#fbbf24]/10 text-[#fbbf24]',
    info: 'bg-[#3b82f6]/10 text-[#3b82f6]',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${styles[status]}`}>
      {children}
    </span>
  );
};

// 5. INPUT FIELD CƠ BẢN
export const InputField = ({ label, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-bold text-[#a0a0a0] uppercase">{label}</label>}
    <input 
      className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#3ecf8e]" 
      {...props} 
    />
  </div>
);


export const DropdownWrapper = ({ isOpen, align = "bottom", children, className = "" }) => {
    const positions = {
        bottom: "top-full mt-2", // Hiện dưới nút (mặc định)
        top: "bottom-full mb-2", // Hiện trên nút
        right: "left-full ml-2 top-0", // Hiện bên phải nút
        left: "right-full mr-2 top-0", // Hiện bên trái nút
    };

  if (!isOpen) return null;
  return (
    <div className={`absolute right-0 ${positions[align]} bg-[#2a2a2a] border border-[#3e3e3e] rounded-xl shadow-2xl z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
};


export const ClickOutsideWrapper = ({ children, onClickOutside, className = "" }) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClickOutside]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {children}
    </div>
  );
};

export const Avatar = ({ name = "Flux", color, border }) => {
  return (
    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${color || 'bg-indigo-600'} text-white font-bold text-lg uppercase shadow-inner ${border || 'border border-[#3e3e3e]'}`}>
      {name.charAt(0)}
    </div>
  );
};