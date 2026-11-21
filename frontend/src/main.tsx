import '@fontsource-variable/dm-sans';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import './styles.css';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Account } from './api';
import { useCart } from './cart';
import { AccountDialog, CartDialog } from './components/dialogs';
import { Layout, type AccountMode } from './components/layout';
import { HomePage } from './pages/HomePage';
import { ProductListingPage } from './pages/ProductListingPage';
import { ProductViewPage } from './pages/ProductViewPage';

function SimplePage({ title, copy }: { title: string; copy: string }) {
  return <div className="container simple-page"><h1>{title}</h1><p>{copy}</p><Link className="button primary" to="/produtos">Explorar produtos</Link></div>;
}

function CatalogAlias() {
  const { search, hash } = useLocation();
  return <Navigate to={`/produtos${search}${hash}`} replace />;
}

function App() {
  const { pathname, hash } = useLocation();
  const cart = useCart();
  const [account, setAccount] = useState<Account | null>(null);
  const [accountMode, setAccountMode] = useState<AccountMode | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    document.title = pathname === '/' ? 'Koisabessa | Móveis e decoração' : pathname === '/produtos'
      ? 'Produtos | Koisabessa' : 'Koisabessa | Loja para casa';
  }, [pathname, hash]);

  return <>
    <Layout count={cart.count} account={account?.firstname || null} onAccount={setAccountMode} onCart={() => setCartOpen(true)}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/produtos" element={<ProductListingPage />} />
        <Route path="/products" element={<CatalogAlias />} />
        <Route path="/product/:id" element={<ProductViewPage cart={cart} openCart={() => setCartOpen(true)} />} />
        <Route path="/meus-pedidos" element={<SimplePage title="Meus pedidos" copy="A Koisabessa é uma loja demonstrativa. Você pode salvar produtos no carrinho durante a visita." />} />
        <Route path="/sobre" element={<SimplePage title="Sobre a Koisabessa" copy="Koisabessa é uma loja demonstrativa de móveis e artigos para casa, desenvolvida por Rodrigo Sousa para o projeto final da Digital College." />} />
        <Route path="*" element={<SimplePage title="Página não encontrada" copy="Volte ao catálogo para continuar explorando a loja." />} />
      </Routes>
    </Layout>
    {cartOpen && <CartDialog cart={cart} close={() => setCartOpen(false)} />}
    {accountMode && <AccountDialog key={accountMode} mode={accountMode} account={account}
      onMode={setAccountMode} onClose={() => setAccountMode(null)}
      onLogin={profile => { setAccount(profile); setAccountMode(null); }}
      onLogout={() => { setAccount(null); setAccountMode(null); }} />}
  </>;
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>);
