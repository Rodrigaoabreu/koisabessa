import { ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { categoryResource, useRemote, type Category, type Page, type Product } from '../api';
import { Notice, ProductListing } from '../components/catalog';

const priceOptions = [
  { value: '', text: 'Todos os preços' },
  { value: '0-200', text: 'Até R$ 200' },
  { value: '200.01-600', text: 'R$ 200,01 a R$ 600' },
  { value: '600.01-1200', text: 'R$ 600,01 a R$ 1.200' },
  { value: '1200.01-99999999.99', text: 'Acima de R$ 1.200' },
];

function FilterGroup({ title, options, selected, onToggle }: {
  title: string; options: Category[]; selected: string[]; onToggle: (slug: string) => void;
}) {
  return <fieldset id="categorias" className="filter-group">
    <legend>{title}</legend>
    <div className="category-inputs">{options.map(category => <label key={category.id}>
      <input type="checkbox" value={category.slug} checked={selected.includes(category.slug)} onChange={() => onToggle(category.slug)} />
      {category.name}
    </label>)}</div>
  </fieldset>;
}

export function ProductListingPage() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const categories = useRemote<Page<Category>>(categoryResource);
  const selected = params.getAll('categoria');
  const term = params.get('filter')?.trim() || '';
  const sort = params.get('ordenar') || '';
  const price = params.get('preco') || '';
  const page = params.get('pagina') || '1';
  const options = categories.status === 'ready' ? categories.data.data : [];
  const ids = selected.map(slug => options.find(category => category.slug === slug)?.id);
  const invalid = categories.status === 'ready' && ids.some(id => id === undefined);
  const query = new URLSearchParams({ page });

  if (term) query.set('match', term);
  if (sort) query.set('sort', sort);
  if (price) query.set('price-range', price);
  if (ids.length) query.set('category_ids', ids.join(','));

  const products = useRemote<Page<Product>>(selected.length && categories.status !== 'ready' || invalid
    ? null : `/product/search?${query}`);

  useEffect(() => {
    if (hash === '#categorias' && categories.status === 'ready') {
      document.getElementById('categorias')?.scrollIntoView({ block: 'nearest' });
    }
  }, [hash, categories.status]);

  function commit(next: URLSearchParams, keepPage = false) {
    if (!keepPage) next.delete('pagina');
    setParams(next);
  }

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    commit(next);
  }

  function toggleCategory(slug: string) {
    const next = new URLSearchParams(params);
    if (selected.includes(slug)) next.delete('categoria', slug);
    else next.append('categoria', slug);
    commit(next);
  }

  function goPage(target: number) {
    const next = new URLSearchParams(params);
    if (target === 1) next.delete('pagina');
    else next.set('pagina', String(target));
    commit(next, true);
    document.getElementById('resultados')?.scrollIntoView({ block: 'start' });
  }

  const hasFilters = Boolean(term || selected.length || price || sort || page !== '1');
  const pageCount = products.status === 'ready' ? Math.ceil(products.data.total / products.data.limit) : 0;

  return <div className="container listing-page">
    <div className="page-heading">
      <h1>{term ? `Resultados para “${term}”` : 'Todos os produtos'}</h1>
      {!term && <p>Móveis, decoração e utilidades para cada ambiente.</p>}
    </div>
    <div className="listing-layout">
      <aside className="filters" aria-label="Filtros do catálogo">
        <div className="filter-header"><SlidersHorizontal size={19} aria-hidden /><h2>Filtrar por</h2></div>
        {categories.status === 'loading' && <p role="status">Carregando categorias…</p>}
        {categories.status === 'error' && <button className="text-button" onClick={categories.retry}>Recarregar categorias</button>}
        {categories.status === 'ready' && <FilterGroup title="Categorias" options={options} selected={selected} onToggle={toggleCategory} />}
        <label className="field">
          <span>Faixa de preço</span>
          <select value={price} onChange={event => setFilter('preco', event.target.value)}>
            {priceOptions.map(option => <option key={option.value} value={option.value}>{option.text}</option>)}
          </select>
        </label>
        {hasFilters && <button className="text-button" onClick={() => setParams({})}>Limpar filtros</button>}
      </aside>
      <section id="resultados" className="results" aria-label="Resultados do catálogo">
        <div className="results-header">
          <h2 aria-live="polite">{products.status === 'ready'
            ? `${products.data.total} ${products.data.total === 1 ? 'produto' : 'produtos'}`
            : 'Produtos'}</h2>
          <label className="sort"><span>Ordenar por</span>
            <select value={sort} onChange={event => setFilter('ordenar', event.target.value)}>
              <option value="">Em destaque</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option>
            </select>
          </label>
        </div>
        {invalid && <Notice title="Categoria não encontrada" message="Limpe os filtros para voltar a ver o catálogo." />}
        {selected.length > 0 && categories.status === 'error'
          && <Notice title="Não foi possível aplicar as categorias" retry={categories.retry} />}
        {!invalid && !(selected.length > 0 && categories.status === 'error') && products.status === 'loading'
          && <Notice title="Carregando produtos…" />}
        {products.status === 'error' && <Notice title="Não foi possível carregar os produtos" retry={products.retry} />}
        {products.status === 'ready' && (products.data.data.length > 0 ?
          <ProductListing products={products.data.data} categories={options} /> :
          <Notice title="Nenhum produto encontrado" message="Experimente outro termo ou limpe os filtros." />)}
        {products.status === 'ready' && pageCount > 1 && <nav className="pagination" aria-label="Páginas do catálogo">
          <button className="icon-button" aria-label="Página anterior" disabled={products.data.page <= 1} onClick={() => goPage(products.data.page - 1)}><ArrowLeft size={20} aria-hidden /></button>
          <span>Página {products.data.page} de {pageCount}</span>
          <button className="icon-button" aria-label="Próxima página" disabled={products.data.page >= pageCount} onClick={() => goPage(products.data.page + 1)}><ArrowRight size={20} aria-hidden /></button>
        </nav>}
      </section>
    </div>
  </div>;
}
