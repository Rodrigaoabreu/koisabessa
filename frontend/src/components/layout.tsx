import { ArrowRight, House, Menu, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export type AccountMode = 'login' | 'signup' | 'profile';

function Logo() {
  return <Link className="brand" to="/" aria-label="Koisabessa, página inicial">
    <House size={27} strokeWidth={1.7} aria-hidden /><span>koisabessa<span className="brand-dot">.</span></span>
  </Link>;
}

const navigation = [
  { label: 'Início', href: '/' },
  { label: 'Produtos', href: '/produtos' },
  { label: 'Categorias', href: '/produtos#categorias' },
  { label: 'Meus pedidos', href: '/meus-pedidos' },
];

function Header({ count, account, onAccount, onCart }: {
  count: number; account: string | null; onAccount: (mode: AccountMode) => void; onCart: () => void;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState(params.get('filter') ?? '');
  const [menu, setMenu] = useState(false);
  const query = params.get('filter') ?? '';

  useEffect(() => { setSearch(query); }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/produtos?${new URLSearchParams({ filter: value })}` : '/produtos');
    setMenu(false);
  }

  return <header className="header">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="container header-top">
      <Logo />
      <form role="search" className="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="busca">Buscar produtos</label>
        <input id="busca" type="search" name="filter" placeholder="O que você procura?" maxLength={160} value={search} onChange={event => setSearch(event.target.value)} />
        <button className="icon-button" type="submit" aria-label="Buscar"><Search size={21} aria-hidden /></button>
      </form>
      <div className="header-actions">
        {account ? <button className="account-button" onClick={() => onAccount('profile')}><UserRound size={21} aria-hidden /> <span>{account}</span></button> : <>
          <button className="create-account" onClick={() => onAccount('signup')}>Cadastre-se</button>
          <button className="account-button" onClick={() => onAccount('login')}><UserRound size={21} aria-hidden /> <span>Entrar</span></button>
        </>}
        <button className="cart-button" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} onClick={onCart}>
          <ShoppingBag size={23} aria-hidden /><span aria-hidden>{count}</span>
        </button>
        <button className="icon-button menu-toggle" aria-label="Menu" aria-expanded={menu} aria-controls="menu-principal" onClick={() => setMenu(value => !value)}><Menu size={23} aria-hidden /></button>
      </div>
    </div>
    <div className={`nav-shell ${menu ? 'is-open' : ''}`}>
      <nav className="container nav" id="menu-principal" aria-label="Menu principal">
        <div>
          {navigation.map(({ label, href }) => {
            const categoryLink = href.includes('#');
            if (categoryLink || href === '/produtos') {
              const active = (location.pathname === '/produtos' && (location.hash === '#categorias') === categoryLink)
                || (!categoryLink && location.pathname.startsWith('/product/'));
              return <Link className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}
                key={href} to={href} onClick={() => setMenu(false)}>{label}</Link>;
            }
            return <NavLink end key={href} to={href} onClick={() => setMenu(false)}>{label}</NavLink>;
          })}
        </div>
        <Link className="nav-feature" to="/produtos?categoria=decoracao">Decoração para casa <ArrowRight size={16} aria-hidden /></Link>
      </nav>
    </div>
  </header>;
}

function Information({ title, informations }: { title: string; informations: { text: string; link: string }[] }) {
  return <div className="footer-group"><h2>{title}</h2><ul>
    {informations.map(item => <li key={item.link}><Link to={item.link}>{item.text}</Link></li>)}
  </ul></div>;
}

function Footer() {
  return <footer className="footer">
    <div className="container">
      <div className="footer-content">
        <div className="footer-intro"><Logo /><p>Móveis, decoração e utilidades para os ambientes da sua casa.</p></div>
        <Information title="Por ambiente" informations={[
          { text: 'Sala de estar', link: '/produtos?categoria=sala' },
          { text: 'Mesa e cozinha', link: '/produtos?categoria=mesa' },
          { text: 'Quarto', link: '/produtos?categoria=quarto' },
        ]} />
        <Information title="Koisabessa" informations={[
          { text: 'Todos os produtos', link: '/produtos' },
          { text: 'Meus pedidos', link: '/meus-pedidos' },
          { text: 'Sobre a loja', link: '/sobre' },
        ]} />
      </div>
      <hr /><p className="copyright">© {new Date().getFullYear()} Koisabessa · Projeto acadêmico Digital College</p>
    </div>
  </footer>;
}

export function Layout({ children, ...header }: {
  children: ReactNode; count: number; account: string | null; onAccount: (mode: AccountMode) => void; onCart: () => void;
}) {
  return <><Header {...header} /><main id="conteudo" tabIndex={-1}>{children}</main><Footer /></>;
}
