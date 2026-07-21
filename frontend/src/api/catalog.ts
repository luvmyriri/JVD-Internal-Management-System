import client from './client';

export interface CatalogFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface ServiceCategory {
  id: number;
  name: string;
  pricing_model: 'per_pax' | 'per_day' | 'flat' | 'per_head_min_pax';
  field_schema: CatalogFieldSchema[];
}

export const catalogApi = {
  getCategories: () => client.get('/sales/catalog').then(res => res.data.categories as ServiceCategory[]),
};
