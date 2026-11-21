import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryResource, useRemote, type Category, type Page, type Product } from '../api';
import { Gallery, Notice, ProductListing, Section } from '../components/catalog';

const collections = [
  { slug: 'sala', title: 'Sala de estar', detail: 'Sofás, poltronas e mesas de centro', alt: 'Poltrona verde ao lado de uma janela' },
  { slug: 'mesa', title: 'Mesa e cozinha', detail: 'Mesas de jantar, cadeiras e cerâmica', alt: 'Mesa de madeira arrumada com pratos de cerâmica' },
  { slug: 'quarto', title: 'Quarto', detail: 'Roupa de cama, abajures e mesas laterais', alt: 'Cama com roupa de linho e mesa de cabeceira' },
];

const slides = [
  { src: '/ambientes/hero.jpg', alt: 'Sala iluminada com poltrona oliva, aparador de madeira e luminária', line: 'Sua casa,', emphasis: 'do seu jeito.', description: 'Móveis e objetos para os cantos onde a vida acontece.', link: '/produtos', cta: 'Explorar produtos' },
  { src: '/ambientes/mesa.jpg', alt: collections[1].alt, line: 'À mesa,', emphasis: 'sem pressa.', description: 'Madeira, cerâmica e peças para servir todo dia.', link: '/produtos?categoria=mesa', cta: 'Ver mesa e cozinha' },
  { src: '/ambientes/quarto.jpg', alt: collections[2].alt, line: 'Hora de', emphasis: 'desacelerar.', description: 'Tecidos, luminárias e móveis para o quarto.', link: '/produtos?categoria=quarto', cta: 'Ver produtos para o quarto' },
];

export function HomePage() {
  const [index, setIndex] = useState(0);
  const products = useRemote<Page<Product>>('/product/search?limit=8');
  const categories = useRemote<Page<Category>>(categoryResource);
  const slide = slides[index];

  return <>
    <div className="container home">
      <section className="hero" aria-label="Destaques da loja">
        <div className="hero-copy">
          <h1>{slide.line}<br /><em>{slide.emphasis}</em></h1>
          <p>{slide.description}</p>
          <Link className="button primary" to={slide.link}>{slide.cta}<ArrowRight size={19} aria-hidden /></Link>
        </div>
        <Gallery images={slides} index={index} onChange={setIndex} label="Ambientes em destaque" />
      </section>

      <Section title="Coleções em destaque" titleAlign="center">
        <div className="collection-grid">
          {collections.map(item => <Link className="collection" key={item.slug} to={`/produtos?categoria=${item.slug}`}>
            <img src={`/ambientes/${item.slug}.jpg`} alt={item.alt} loading="lazy" />
            <div className="collection-caption">
              <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              <ArrowRight size={21} aria-hidden />
            </div>
          </Link>)}
        </div>
      </Section>

      <Section title="Produtos em alta" link={{ text: 'Ver todos', href: '/produtos' }}>
        {products.status === 'loading' && <Notice title="Carregando produtos…" />}
        {products.status === 'error' && <Notice title="Não foi possível carregar os produtos" retry={products.retry} />}
        {products.status === 'ready' && (products.data.total
          ? <ProductListing products={products.data.data} categories={categories.status === 'ready' ? categories.data.data : []} />
          : <Notice title="O catálogo está vazio" />)}
      </Section>
    </div>
  </>;
}
