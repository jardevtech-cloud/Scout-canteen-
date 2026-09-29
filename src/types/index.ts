export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'cashier';
  phone?: string;
  is_active?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  supplier?: string;
  unit?: string;
  image_url?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  is_default: number;
  product_count?: number;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  product_name: string;
  barcode?: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  cashier_id: number;
  cashier_name: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  payment_reference?: string;
  notes?: string;
  scout_name?: string;
  scout_id?: string;
  patrol?: string;
  unit_section?: string;
  school_group?: string;
  status: string;
  shift_id?: number;
  created_at: string;
  items?: SaleItem[];
}

export interface CashierShift {
  id: number;
  cashier_id: number;
  cashier_name: string;
  opening_cash: number;
  cash_sales: number;
  mtn_momo_sales: number;
  airtel_money_sales: number;
  card_sales: number;
  other_sales: number;
  total_sales: number;
  expected_cash: number;
  actual_cash?: number;
  difference?: number;
  notes?: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name: string;
  change_qty: number;
  previous_qty: number;
  new_qty: number;
  reason: string;
  reference_id?: string;
  user_name: string;
  created_at: string;
}

export interface ScoutMember {
  id: number;
  member_number: string;
  full_name: string;
  patrol?: string;
  unit_section?: string;
  group_name?: string;
  contact?: string;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name: string;
  action: string;
  target_type?: string;
  target_id?: string;
  description: string;
  details?: string;
  created_at: string;
}

export interface HeldSale {
  id: string;
  reference_name: string;
  cashier_name: string;
  cart: CartItem[];
  total_amount: number;
  created_at: string;
}

export interface SystemSettings {
  canteen_name: string;
  canteen_address: string;
  telephone: string;
  email: string;
  currency: string;
  currency_symbol: string;
  receipt_width: '58mm' | '80mm';
  receipt_header: string;
  receipt_footer: string;
  allow_negative_inventory: string;
  low_stock_threshold: string;
  tin_number: string;
  tax_rate: string;
}
