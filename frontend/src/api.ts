import { useEffect, useState } from 'react';

export type Category = { id: number; name: string; slug: string; use_in_menu: boolean };
export type ProductImage = { id: number; content: string };
export type ProductOption = {
  id: number;
  title: string;
  shape: 'square' | 'circle';
  radius: number;
  type: 'text' | 'color';
  values: string[];
};
export type Product = {
  id: number;
  name: string;
  slug: string;
  stock: number;
  description: string | null;
  price: number;
  price_with_discount: number;
  category_ids: number[];
  images: ProductImage[];
  options: ProductOption[];
};
export type Page<T> = { data: T[]; total: number; limit: number; page: number };
export type Account = { id: number; firstname: string; surname: string; email: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function request<T>(resource: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/v1${resource}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, response.status >= 500
      ? 'A loja está temporariamente indisponível. Tente novamente.'
      : data?.message || 'Não foi possível concluir esta ação.');
  }
  if (data === null && response.status !== 204) {
    throw new ApiError(502, 'A loja não recebeu uma resposta válida. Tente novamente.');
  }
  return data as T;
}

export function post<T>(resource: string, body: Record<string, FormDataEntryValue>) {
  return request<T>(resource, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type Remote<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error };

export function useRemote<T>(resource: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: Remote<T> }>();
  const key = `${attempt}:${resource}`;

  useEffect(() => {
    if (!resource) return;
    const controller = new AbortController();
    request<T>(resource, { signal: controller.signal })
      .then(data => setResult({ key, state: { status: 'ready', data } }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setResult({ key, state: { status: 'error', error } });
      });
    return () => controller.abort();
  }, [key, resource]);

  const state: Remote<T> = result?.key === key ? result.state : { status: 'loading' };
  return { ...state, retry: () => setAttempt(value => value + 1) };
}

export const categoryResource = '/category/search?limit=-1&use_in_menu=true';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatMoney = (value: number) => brl.format(value);
export const sellingPrice = (product: Product) => product.price_with_discount || product.price;

const colorNames: Record<string, string> = {
  '#68704a': 'Oliva', '#ddd0b8': 'Areia', '#9e6047': 'Terracota',
  '#e3dbcb': 'Linho cru', '#a3a296': 'Cinza', '#bea987': 'Aveia', '#8a6950': 'Castanho',
};
export function optionLabel(option: ProductOption, value: string) {
  return option.type === 'color' ? colorNames[value.toLowerCase()] ?? value : value;
}
