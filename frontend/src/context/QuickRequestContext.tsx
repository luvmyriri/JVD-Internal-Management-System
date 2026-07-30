import React, { createContext, useContext, useState } from 'react';

export type QuickRequestTab = 'cash_budget' | 'commission';

interface QuickRequestContextType {
  isOpen: boolean;
  activeTab: QuickRequestTab;
  openQuickRequest: (tab?: QuickRequestTab) => void;
  closeQuickRequest: () => void;
}

const QuickRequestContext = createContext<QuickRequestContextType | undefined>(undefined);

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

export const useQuickRequest = () => {
  const context = useContext(QuickRequestContext);
  if (!context) {
    throw new Error('useQuickRequest must be used within a QuickRequestProvider');
  }
  return context;
};
