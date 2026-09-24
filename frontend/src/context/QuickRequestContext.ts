import { createContext, useContext } from 'react';

export type QuickRequestTab = 'cash_budget' | 'commission';

export interface QuickRequestContextType {
  isOpen: boolean;
  activeTab: QuickRequestTab;
  openQuickRequest: (tab?: QuickRequestTab) => void;
  closeQuickRequest: () => void;
}

export const QuickRequestContext = createContext<QuickRequestContextType | undefined>(undefined);

export function useQuickRequest(): QuickRequestContextType {
  const context = useContext(QuickRequestContext);
  if (!context) throw new Error('useQuickRequest must be used within a QuickRequestProvider');
  return context;
}

export { QuickRequestProvider } from './QuickRequestProvider';
