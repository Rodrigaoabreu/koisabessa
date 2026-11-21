import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { formatMoney, post, request, type Account } from '../api';
import { itemCap, type Cart } from '../cart';
import { ProductPhoto } from './catalog';
import type { AccountMode } from './layout';

function Dialog({ title, drawer = false, onClose, children }: {
  title: string; drawer?: boolean; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={drawer ? 'dialog drawer' : 'dialog'} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) ref.current?.close(); }}>
    <div className="dialog-body">
      <div className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" type="button" aria-label="Fechar" onClick={() => ref.current?.close()}><X size={23} aria-hidden /></button></div>
      {children}
    </div>
  </dialog>;
}

export function CartDialog({ cart, close }: { cart: Cart; close: () => void }) {
  return <Dialog title="Seu carrinho" drawer onClose={close}>
    {!cart.items.length ? <div className="empty-cart">
      <ShoppingBag size={39} strokeWidth={1.3} aria-hidden /><p>Seu carrinho está vazio.</p>
      <button type="button" className="button primary" onClick={close}>Continuar explorando</button>
    </div> : <>
      <ul className="cart-items">{cart.items.map(item => <li key={item.key}>
        <div className="cart-photo"><ProductPhoto src={item.image} alt="" /></div>
        <div><h3>{item.name}</h3>{item.variant && <p>{item.variant}</p>}<strong>{formatMoney(item.unitPrice)}</strong>
          <div className="quantity" aria-label={`Quantidade de ${item.name}`}>
            <button className="icon-button" disabled={item.quantity === 1} aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => cart.change(item.key, -1)}><Minus size={16} aria-hidden /></button>
            <span aria-live="polite">{item.quantity}</span>
            <button className="icon-button" disabled={item.quantity >= itemCap(cart.items, item)} aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => cart.change(item.key, 1)}><Plus size={16} aria-hidden /></button>
          </div>
        </div>
        <button className="icon-button remove-item" aria-label={`Remover ${item.name}`} onClick={() => cart.remove(item.key)}><Trash2 size={19} aria-hidden /></button>
      </li>)}</ul>
      <div className="cart-summary"><p><span>Subtotal</span><strong>{formatMoney(cart.subtotal)}</strong></p>
        <small>Carrinho demonstrativo. Seus itens ficam salvos neste navegador.</small>
        <button className="button primary" onClick={close}>Continuar explorando</button>
      </div>
    </>}
  </Dialog>;
}

function accountId(token: string) {
  const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return Number(JSON.parse(atob(segment)).sub);
}

export function AccountDialog({ mode, account, onMode, onClose, onLogin, onLogout }: {
  mode: AccountMode; account: Account | null; onMode: (mode: AccountMode) => void; onClose: () => void;
  onLogin: (account: Account) => void; onLogout: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const signup = mode === 'signup';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError('');
    try {
      if (signup) await post<Account>('/user', values);
      const { token } = await post<{ token: string }>('/user/token', { email: values.email, password: values.password });
      const session = await request<Account>(`/user/${accountId(token)}`, { headers: { Authorization: `Bearer ${token}` } });
      onLogin(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return <Dialog title={mode === 'profile' ? 'Minha conta' : signup ? 'Criar conta' : 'Entrar'} onClose={onClose}>
    {mode === 'profile' && account ? <div className="account-profile">
      <p><strong>{account.firstname} {account.surname}</strong><br />{account.email}</p>
      <button className="button secondary" onClick={onLogout}>Sair da conta</button>
    </div> : <form className="account-form" onSubmit={event => void submit(event)}>
      {signup && <div className="name-fields">
        <label className="field"><span>Nome</span><input required name="firstname" maxLength={80} autoComplete="given-name" /></label>
        <label className="field"><span>Sobrenome</span><input required name="surname" maxLength={120} autoComplete="family-name" /></label>
      </div>}
      <label className="field"><span>E-mail</span><input required name="email" type="email" maxLength={254} autoComplete="email" /></label>
      <label className="field"><span>Senha</span><input required name="password" type="password" minLength={signup ? 8 : 1} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
      {signup && <label className="field"><span>Confirmar senha</span><input required name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={pending}>{pending ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar'}</button>
      <button className="text-button" type="button" disabled={pending} onClick={() => onMode(signup ? 'login' : 'signup')}>
        {signup ? 'Já tenho conta' : 'Quero criar uma conta'}
      </button>
    </form>}
  </Dialog>;
}
