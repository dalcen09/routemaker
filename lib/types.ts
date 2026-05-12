export interface Customer {
  id: string;
  lastName: string;
  firstName: string;
  company: string;
  department: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  geocoded?: boolean;
}

export interface RouteStop {
  customer: Customer;
  order: number;
  legDistance: string;
  legDuration: string;
}

export interface RouteResult {
  stops: RouteStop[];
  totalDistance: string;
  totalDuration: string;
  polyline: string;
  stepPolylines: string[];
  waypointOrder: number[];
}

export interface StartLocation {
  address: string;
  lat: number;
  lng: number;
}
