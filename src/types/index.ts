// Types for the GET Meats app
import { BoxStatus, OrderStatus } from './status'

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
  sendPix?: boolean; // Whether to send Pix/payment link automatically for prepaid purchases
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deletedAt?: string; // ISO date string when deleted (soft delete)
}

export interface Purchase {
  id: string; // Unique ID
  orderNumber: string; // Internal order number for easy identification
  boxId: string; // Reference to the meat box
  userId: string; // Reference to the customer
  kgPurchased: number; // Kg purchased by the customer
  totalAmount: number; // Total amount paid (kg * pricePerKg)
  status: OrderStatus; // Status of the purchase
  paymentStatus: 'pending' | 'paid' | 'refunded'; // Payment status
  paymentLink?: string; // Pix payment link (for prepaid purchases)
  paymentExpiresAt?: string; // When the payment expires (ISO date string)
  actualKgDelivered?: number; // Actual kg delivered (filled by manager)
  refundAmount?: number; // Refund amount if applicable
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

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

// Re-export status enums for convenience
export { BoxStatus, OrderStatus } from './status'