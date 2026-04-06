// 📦 Categorias

export type ProductCategory =
  | "gas"
  | "agua"
  | "carvao";



// 📦 Produto

export interface Product {

  id: string;

  name: string;

  description: string;

  price: number;

  image: string;

  category: ProductCategory;

  // 🧠 melhorias futuras

  stock?: number;

  active?: boolean;

}



// 🛒 Item do carrinho

export interface CartItem {

  product: Product;

  quantity: number;

}



// 💳 Pagamento

export type PaymentMethod =
  | "pix"
  | "credito"
  | "debito"
  | "dinheiro";



export type PaymentTiming =
  | "agora"
  | "entrega";



// 📦 Status do pedido

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "delivering"
  | "delivered"
  | "cancelled";



// 👤 Cliente

export interface Customer {

  id: string;

  name: string;

  phone: string;

  address: string;

  created_at?: string;

}



// 📦 Pedido

export interface Order {

  id: string;

  customer_id: string;

  total: number;

  status: OrderStatus;

  payment_method: PaymentMethod;

  payment_timing: PaymentTiming;

  created_at: string;

}
