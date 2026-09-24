import { createContext, useContext } from 'react';

export type PreviewEntityType = 'supplier' | 'inventory' | 'driver' | 'customer' | 'job_order' | 'document' | 'search' | null;

export interface EntityPreviewState {
  isOpen: boolean;
  entityType: PreviewEntityType;
  entityId: number | null;
  searchQuery: string | null;
}

export interface EntityPreviewContextType extends EntityPreviewState {
  showPreview: (type: PreviewEntityType, id: number) => void;
  showSearchPreview: (query: string) => void;
  closePreview: () => void;
}

export const EntityPreviewContext = createContext<EntityPreviewContextType | undefined>(undefined);

export function useEntityPreview(): EntityPreviewContextType {
  const context = useContext(EntityPreviewContext);
  if (context === undefined) throw new Error('useEntityPreview must be used within an EntityPreviewProvider');
  return context;
}

export { EntityPreviewProvider } from './EntityPreviewProvider';
