// Types for the GET Meats app

export interface MeatBox {
  id: string; // Unique ID
  name: string; // Name of the meat
  brand: string; // Brand of the meat
  photos: string[]; // Array of photo URLs (can be multiple)
  pricePerKg: number; // Price per kg for customers
  costPerKg: number; // Cost per kg for the manager (not visible to customers)
  totalKg: number; // Total kg in the box
  remainingKg: number; // Remaining kg available for purchase
  minKgPerPerson: number; // Minimum kg per person (0 if no minimum)
  status: BoxStatus; // Current status of the box
  paymentType: 'prepaid' | 'postpaid'; // Payment type: prepaid (at purchase) or postpaid (after delivery)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deletedAt?: string; // ISO date string when deleted (soft delete)
}

export type BoxStatus =
  | 'awaiting_customer_purchases' // Initial status
  | 'awaiting_supplier_purchase'
  | 'awaiting_supplier_delivery'
  | 'received_at_warehouse'
  | 'dispatching_to_customers'
  | 'completed'
  | 'cancelled';

export interface Purchase {
  id: string; // Unique ID
  boxId: string; // Reference to the meat box
  userId: string; // Reference to the customer
  kgPurchased: number; // Kg purchased by the customer
  status: PurchaseStatus; // Status of the purchase
  paymentStatus: 'pending' | 'paid' | 'refunded'; // Payment status
  actualKgDelivered?: number; // Actual kg delivered (filled by manager)
  refundAmount?: number; // Refund amount if applicable
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export type PurchaseStatus =
  | 'awaiting_box_closure'
  | 'awaiting_payment'
  | 'awaiting_supplier'
  | 'dispatching'
  | 'delivered'
  | 'cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  phone: string;
  profileCompleted: boolean;
  role: 'customer' | 'manager'; // Role for access control
  createdAt: string;
  updatedAt: string;
}