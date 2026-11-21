import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatMoney, optionLabel, sellingPrice, type Category, type Product, type ProductOption } from '../api';

type LinkProps = { text: string; href: string };

export function Section({ title, titleAlign = 'left', link, children }: {
  title: string; titleAlign?: 'left' | 'center'; link?: LinkProps; children: ReactNode;
}) {
  return <section className="section">
    <div className={`section-heading ${titleAlign === 'center' ? 'section-heading-center' : ''}`}>
      <h2>{title}</h2>
      {link && <Link className="text-link" to={link.href}>{link.text}<ArrowRight size={18} aria-hidden /></Link>}
    </div>
    {children}
  </section>;
}

export function Notice({ title, message, retry }: { title: string; message?: string; retry?: () => void }) {
  return <div className="notice" role={retry ? 'alert' : 'status'}>
    <p className="notice-title">{title}</p>
    {message && <p>{message}</p>}
    {retry && <button className="button secondary" onClick={retry}>Tentar novamente</button>}
  </div>;
}

export function ProductPhoto({ src, alt, loading = 'lazy' }: { src?: string; alt: string; loading?: 'lazy' | 'eager' }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return src && failedSrc !== src
    ? <img src={src} alt={alt} loading={loading} onError={() => setFailedSrc(src)} />
    : <span className="image-fallback" role="img" aria-label={alt ? `${alt}: imagem indisponível` : 'Imagem indisponível'}><ImageOff size={29} aria-hidden /></span>;
}

export function Money({ product }: { product: Product }) {
  const discounted = sellingPrice(product) < product.price;
  return <div className="price">
    <strong>{formatMoney(sellingPrice(product))}</strong>
    {discounted && <del><span className="sr-only">Preço anterior </span>{formatMoney(product.price)}</del>}
  </div>;
}

export function ProductCard({ product, category }: { product: Product; category?: string }) {
  const discount = Math.round((1 - sellingPrice(product) / product.price) * 100);
  return <article className="product-card">
    <Link to={`/product/${product.id}`} className="product-link">
      <div className="product-image">
        <ProductPhoto src={product.images[0]?.content} alt="" />
        {discount > 0 && <span className="discount">−{discount}%</span>}
      </div>
      <div className="product-copy">
        {category && <span className="product-category">{category}</span>}
        <h3>{product.name}</h3>
        <Money product={product} />
        {!product.stock && <span className="unavailable">Indisponível</span>}
      </div>
    </Link>
  </article>;
}

export function ProductListing({ products, categories = [] }: { products: Product[]; categories?: Category[] }) {
  const names = new Map(categories.map(category => [category.id, category.name]));
  return <div className="product-grid">
    {products.map(product => <ProductCard key={product.id} product={product} category={names.get(product.category_ids[0])} />)}
  </div>;
}

export function Gallery({ images, index, onChange, showThumbs = false, label, children }: {
  images: { src?: string; alt: string }[]; index: number; onChange: (index: number) => void;
  showThumbs?: boolean; label: string; children?: ReactNode;
}) {
  const current = images[index];
  return <div className={`gallery ${showThumbs ? 'gallery-detail' : ''}`} aria-label={label}>
    <div className="gallery-image">
      <ProductPhoto src={current?.src} alt={current?.alt || label} loading="eager" />
      {children}
      {images.length > 1 && <div className="gallery-controls">
        <button type="button" className="icon-button" aria-label="Imagem anterior" disabled={index === 0} onClick={() => onChange(index - 1)}><ArrowLeft size={19} aria-hidden /></button>
        <span aria-live="polite">{index + 1} / {images.length}</span>
        <button type="button" className="icon-button" aria-label="Próxima imagem" disabled={index === images.length - 1} onClick={() => onChange(index + 1)}><ArrowRight size={19} aria-hidden /></button>
      </div>}
    </div>
    {showThumbs && images.length > 1 && <div className="thumbs">
      {images.map((image, position) => <button type="button" key={position}
        onClick={() => onChange(position)} aria-label={`Exibir imagem ${position + 1}`} aria-pressed={index === position}>
        <ProductPhoto src={image.src} alt="" />
      </button>)}
    </div>}
  </div>;
}

export function ProductOptions({ option, selected, onChange }: {
  option: ProductOption; selected?: string; onChange: (value: string) => void;
}) {
  return <fieldset className="product-option">
    <legend>{option.title}{selected && <span> · {optionLabel(option, selected)}</span>}</legend>
    <div className="option-values">
      {option.values.map(value => {
        const label = optionLabel(option, value);
        const color = option.type === 'color';
        return <label key={value} className={`option ${color ? 'swatch' : ''} ${option.shape}`}
          style={option.shape === 'square' ? { borderRadius: option.radius } : undefined} title={label}>
          <input name={`option-${option.id}`} type="radio" checked={value === selected} onChange={() => onChange(value)} />
          {color ? <span className="color-sample" style={{ backgroundColor: value }}><span className="sr-only">{label}</span></span> : <span>{label}</span>}
        </label>;
      })}
    </div>
  </fieldset>;
}

export function BuyBox({ product, onBuy, available, complete, children }: {
  product: Product; onBuy: () => void; available: number; complete: boolean; children: ReactNode;
}) {
  return <section className="buy-box">
    <h1>{product.name}</h1>
    <p className="reference">Ref. KB-{String(product.id).padStart(4, '0')}</p>
    <Money product={product} />
    {product.description && <p className="description">{product.description}</p>}
    {children}
    <p className={`stock ${available ? '' : 'out-of-stock'}`}>
      {available > 0 ? 'Em estoque' : product.stock ? 'Estoque disponível já está no carrinho' : 'Produto indisponível'}
    </p>
    <button className="button primary buy-button" type="button" onClick={onBuy} disabled={!available || !complete}>Comprar<ArrowRight size={19} aria-hidden /></button>
    {!complete && available > 0 && <p className="help-copy">Selecione as opções para adicionar ao carrinho.</p>}
  </section>;
}
