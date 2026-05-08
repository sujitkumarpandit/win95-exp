export interface User {
  id: number;
  email: string;
  income?: number;
}

export interface Expense {
  id: number;
  user_id: number;
  date: string;
  category: string;
  description: string;
  amount: number | string;
  payment_method: string;
  status: string;
}

export type Category = 
  | 'Food' | 'Utilities' | 'Rent' | 'Fun' | 'Transport' 
  | 'Healthcare' | 'Education' | 'Shopping' | 'Subscriptions' 
  | 'Insurance' | 'Savings' | 'Gifts' | 'Investment' | 'Other';

export const CATEGORIES: Category[] = [
  'Food', 'Utilities', 'Rent', 'Fun', 'Transport', 
  'Healthcare', 'Education', 'Shopping', 'Subscriptions', 
  'Insurance', 'Savings', 'Gifts', 'Investment', 'Other'
];

export type PaymentMethod = 'Cash' | 'CC' | 'Check' | 'Transfer';
export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'CC', 'Check', 'Transfer'];

export type ExpenseStatus = 'Pending' | 'Paid' | 'Cancelled';
export const EXPENSE_STATUSES: ExpenseStatus[] = ['Pending', 'Paid', 'Cancelled'];
