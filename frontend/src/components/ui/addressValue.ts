export interface AddressValue {
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  street: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  regionCode: '', regionName: '',
  provinceCode: '', provinceName: '',
  cityCode: '', cityName: '',
  barangayCode: '', barangayName: '',
  street: '',
};

export function formatFullAddress(value: AddressValue): string {
  return [value.street, value.barangayName, value.cityName, value.provinceName, value.regionName]
    .filter(Boolean)
    .join(', ');
}
