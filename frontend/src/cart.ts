import { useEffect, useState } from 'react';
import { optionLabel, sellingPrice, type Product } from './api';

export type CartItem = {
  key: string;
  productId: number;
  name: string;
  image?: string;
  variant: string;
  unitPrice: number;
  stock: number;
  quantity: number;
};

const storageKey = 'koisabessa:cart:v1';

function isItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.key === 'string' && typeof item.name === 'string'
    && typeof item.variant === 'string' && typeof item.unitPrice === 'number'
    && Number.isFinite(item.unitPrice) && item.unitPrice >= 0
    && typeof item.productId === 'number' && Number.isInteger(item.productId)
    && typeof item.stock === 'number' && Number.isInteger(item.stock)
    && typeof item.quantity === 'number' && Number.isInteger(item.quantity)
    && item.quantity > 0 && item.quantity <= item.stock
    && (item.image === undefined || typeof item.image === 'string');
}

function readCart(): CartItem[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(saved) ? saved.filter(isItem) : [];
  } catch {
    return [];
  }
}

const quantityFor = (items: CartItem[], productId: number) =>
  items.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);

export const itemCap = (items: CartItem[], item: CartItem) =>
  item.stock - quantityFor(items, item.productId) + item.quantity;

export function useCart() {
  const [items, setItems] = useState(readCart);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // The session cart still works when browser storage is unavailable.
    }
  }, [items]);

  function add(product: Product, selection: Record<number, string>) {
    const options = product.options.map(option => [option.id, selection[option.id]] as const);
    const key = JSON.stringify([product.id, options]);
    const variant = product.options.map(option => optionLabel(option, selection[option.id])).join(' · ');
    setItems(current => {
      if (quantityFor(current, product.id) >= product.stock) return current;
      const existing = current.find(item => item.key === key);
      const next = {
        key, productId: product.id, name: product.name, image: product.images[0]?.content,
        variant, unitPrice: sellingPrice(product), stock: product.stock, quantity: (existing?.quantity ?? 0) + 1,
      };
      return existing ? current.map(item => item.key === key ? next : item) : [...current, next];
    });
  }

  function change(key: string, delta: number) {
    setItems(current => current.map(item => {
      if (item.key !== key) return item;
      const quantity = Math.max(1, Math.min(item.quantity + delta, itemCap(current, item)));
      return { ...item, quantity };
    }));
  }

  return {
    items, add, change,
    remove: (key: string) => setItems(current => current.filter(item => item.key !== key)),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0) / 100,
    quantityFor: (id: number) => quantityFor(items, id),
  };
}

export type Cart = ReturnType<typeof useCart>;
