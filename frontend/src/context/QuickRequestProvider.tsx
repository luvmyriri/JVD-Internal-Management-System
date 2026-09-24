import React, { useState } from 'react';
import { QuickRequestContext, type QuickRequestTab } from './QuickRequestContext';

export const QuickRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickRequestTab>('cash_budget');

  const openQuickRequest = (tab: QuickRequestTab = 'cash_budget') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const closeQuickRequest = () => {
    setIsOpen(false);
  };

  return (
    <QuickRequestContext.Provider
      value={{
        isOpen,
        activeTab,
        openQuickRequest,
        closeQuickRequest,
      }}
    >
      {children}
    </QuickRequestContext.Provider>
  );
};
