export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  brandName?: string;   // NEW
  brandLogo?: string;   // NEW
}