import React, { createContext, useContext, useState } from 'react';

export type PreviewEntityType = 'supplier' | 'inventory' | 'driver' | 'customer' | 'search' | null;

interface EntityPreviewState {
  isOpen: boolean;
  entityType: PreviewEntityType;
  entityId: number | null;
  searchQuery: string | null;
}

interface EntityPreviewContextType extends EntityPreviewState {
  showPreview: (type: PreviewEntityType, id: number) => void;
  showSearchPreview: (query: string) => void;
  closePreview: () => void;
}

const EntityPreviewContext = createContext<EntityPreviewContextType | undefined>(undefined);

export function EntityPreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EntityPreviewState>({
    isOpen: false,
    entityType: null,
    entityId: null,
    searchQuery: null,
  });

  const showPreview = (type: PreviewEntityType, id: number) => {
    setState({
      isOpen: true,
      entityType: type,
      entityId: id,
      searchQuery: null,
    });
  };

  const showSearchPreview = (query: string) => {
    setState({
      isOpen: true,
      entityType: 'search',
      entityId: null,
      searchQuery: query,
    });
  };

  const closePreview = () => {
    setState({
      isOpen: false,
      entityType: null,
      entityId: null,
      searchQuery: null,
    });
  };

  return (
    <EntityPreviewContext.Provider value={{ ...state, showPreview, showSearchPreview, closePreview }}>
      {children}
    </EntityPreviewContext.Provider>
  );
}

export function useEntityPreview() {
  const context = useContext(EntityPreviewContext);
  if (context === undefined) {
    throw new Error('useEntityPreview must be used within an EntityPreviewProvider');
  }
  return context;
}
