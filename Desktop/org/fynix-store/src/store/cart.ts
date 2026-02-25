import { nixStore } from "fynixui";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CartStore {
  items: CartItem[];
  coupon: string | null;
  discount: number;
}

export const cart = nixStore<CartStore>({
  items: [],
  coupon: null,
  discount: 0,
});
