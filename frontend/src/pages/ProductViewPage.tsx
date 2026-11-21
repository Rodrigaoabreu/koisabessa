import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, useRemote, type Page, type Product } from '../api';
import type { Cart } from '../cart';
import { BuyBox, Gallery, Notice, ProductListing, ProductOptions, Section } from '../components/catalog';

function Related({ product }: { product: Product }) {
  const categories = product.category_ids.join(',');
  const query = new URLSearchParams({ limit: '5' });
  if (categories) query.set('category_ids', categories);
  const products = useRemote<Page<Product>>(`/product/search?${query}`);
  const related = products.status === 'ready' ? products.data.data.filter(item => item.id !== product.id).slice(0, 4) : [];
  if (products.status === 'ready' && !related.length) return null;
  return <Section title="Produtos recomendados" link={{ text: 'Ver todos', href: '/produtos' }}>
    {products.status === 'loading' && <Notice title="Carregando recomendações…" />}
    {products.status === 'error' && <Notice title="Não foi possível carregar as recomendações" retry={products.retry} />}
    {related.length > 0 && <ProductListing products={related} />}
  </Section>;
}

function ProductDetails({ product, cart, openCart }: { product: Product; cart: Cart; openCart: () => void }) {
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Record<number, string>>({});
  const complete = product.options.every(option => option.values.includes(selection[option.id]));
  const available = Math.max(0, product.stock - cart.quantityFor(product.id));
  const images = product.images.map((image, position) => ({
    src: image.content, alt: `${product.name} — foto ${position + 1}`,
  }));

  return <>
    <nav className="breadcrumbs" aria-label="Caminho da página">
      <Link to="/">Início</Link><ChevronRight size={15} aria-hidden />
      <Link to="/produtos">Produtos</Link><ChevronRight size={15} aria-hidden />
      <span aria-current="page">{product.name}</span>
    </nav>
    <div className="detail-layout">
      <Gallery images={images} index={index} onChange={setIndex} label={product.name} showThumbs />
      <BuyBox product={product} available={available} complete={complete} onBuy={() => { cart.add(product, selection); openCart(); }}>
        {product.options.map(option => <ProductOptions key={option.id} option={option} selected={selection[option.id]}
          onChange={value => setSelection(current => ({ ...current, [option.id]: value }))} />)}
      </BuyBox>
    </div>
    <Related product={product} />
  </>;
}

export function ProductViewPage({ cart, openCart }: { cart: Cart; openCart: () => void }) {
  const { id } = useParams();
  const product = useRemote<Product>(`/product/${encodeURIComponent(id ?? '')}`);
  const missing = product.status === 'error' && product.error instanceof ApiError && product.error.status === 404;

  return <div className="container detail-page">
    {product.status === 'loading' && <Notice title="Carregando produto…" />}
    {missing && <div className="simple-page"><h1>Produto não encontrado</h1><Link className="button primary" to="/produtos">Voltar aos produtos</Link></div>}
    {product.status === 'error' && !missing && <Notice title="Não foi possível carregar o produto" retry={product.retry} />}
    {product.status === 'ready' && <ProductDetails key={product.data.id} product={product.data} cart={cart} openCart={openCart} />}
  </div>;
}
