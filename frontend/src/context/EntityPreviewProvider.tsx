import React, { useState } from 'react';
import { EntityPreviewContext, type EntityPreviewState, type PreviewEntityType } from './EntityPreviewContext';

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
