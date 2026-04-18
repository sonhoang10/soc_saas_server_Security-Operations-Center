import { createContext, useContext, useState } from 'react';

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Hàm bổ trợ để chuyển trang nhanh từ bất cứ đâu
  const navigateTo = (tabName) => {
    setActiveTab(tabName);
  };

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, navigateTo }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = () => useContext(TabContext);