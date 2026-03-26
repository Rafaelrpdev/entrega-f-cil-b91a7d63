export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'gas' | 'agua' | 'carvao';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';
export type PaymentTiming = 'agora' | 'entrega';
