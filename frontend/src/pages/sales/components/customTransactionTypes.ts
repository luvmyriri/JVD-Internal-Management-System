export interface BusRentalData {
  vehicleType: string;
  route: string;
  serviceDate: string;
  days: string;
  plateNumber: string;
  inclusions: Record<string, boolean>;
  travelDate: string;
  busId: number | null;
  driverId: number | null;
  driverName: string;
  selectedSeats: string[];
  pickupLocation: string;
  paxCount: string;
}

export interface EduTourData {
  schoolName: string;
  gradeLevel: string;
  expectedPax: string;
  stops: string;
  serviceDate: string;
  busId: string;
  inclusions: Record<string, boolean>;
}

export interface TourPackageData {
  destination: string;
  travelDates: string;
  adults: string;
  children: string;
  accommodation: string;
  itinerary: string;
}

export interface VisaProcessingData {
  country: string;
  visaType: string;
  applicants: string;
  requirements: Record<string, boolean>;
}

export interface JoinersData {
  tourCode: string;
  travelDate: string;
  paxCount: string;
  pickupLocation: string;
}

export interface BookingData {
  bookingType: string;
  referenceCode: string;
  details: string;
  guests: string;
}

export const INITIAL_BUS_RENTAL: BusRentalData = {
  vehicleType: 'Bus',
  route: '',
  serviceDate: '',
  days: '1',
  plateNumber: '',
  inclusions: { driver: true, fuel: true, toll: false, insurance: true },
  travelDate: '',
  busId: null,
  driverId: null,
  driverName: '',
  selectedSeats: [],
  pickupLocation: '',
  paxCount: '1',
};

export const INITIAL_EDU_TOUR: EduTourData = {
  schoolName: '',
  gradeLevel: '',
  expectedPax: '50',
  stops: '',
  serviceDate: '',
  busId: '',
  inclusions: { meals: true, coordinator: true, insurance: true, tshirt: false },
};

export const INITIAL_TOUR_PACKAGE: TourPackageData = {
  destination: '',
  travelDates: '',
  adults: '1',
  children: '0',
  accommodation: 'Hotel',
  itinerary: '',
};

export const INITIAL_VISA_PROCESSING: VisaProcessingData = {
  country: 'Japan',
  visaType: 'Tourist',
  applicants: '',
  requirements: { passport: true, photo: true, bankCert: false, itr: false, birthCert: false },
};

export const INITIAL_JOINERS: JoinersData = {
  tourCode: '',
  travelDate: '',
  paxCount: '1',
  pickupLocation: '',
};

export const INITIAL_BOOKING: BookingData = {
  bookingType: 'Flight',
  referenceCode: '',
  details: '',
  guests: '',
};
