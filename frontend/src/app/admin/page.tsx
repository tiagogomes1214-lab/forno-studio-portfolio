"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, money, type Order, type Product } from "@/lib/api";
import { LogOut, Package, Pizza, RefreshCw, ShoppingBag } from "lucide-react";

const statuses = [
  "Aguardando pagamento",
  "Recebido",
  "Em preparo",
  "Saiu para entrega",
  "Pronto para retirada",
  "Concluído",
  "Cancelado",
];

type ProductForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  image: string;
  badge: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "Clássicas",
  price: "39.90",
  image: "",
  badge: "",
  active: true,
};

function formatError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function Admin() {
  const [logged, setLogged] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  // Credentials are entered by the administrator and sent only to the backend.
  // They are not embedded in NEXT_PUBLIC_* variables or the public JavaScript bundle.
  const authHeaders = (username = u, password = p): HeadersInit => ({
    "Content-Type": "application/json",
    "X-Admin-User": username,
    "X-Admin-Password": password,
  });

  async function load(username = u, password = p) {
    setLoading(true);
    setError("");
    try {
      const headers = authHeaders(username, password);
      const [orderData, productData] = await Promise.all([
        apiRequest<Order[]>("/api/admin/orders", { headers }),
        apiRequest<Product[]>("/api/admin/products", { headers }),
      ]);
      setOrders(orderData);
      setProducts(productData);
    } catch (err) {
      setError(formatError(err, "Não foi possível carregar os dados."));
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      // The server, not the browser, decides whether the credentials are valid.
      await apiRequest<Order[]>("/api/admin/orders", { headers: authHeaders(u, p) });
      setLogged(true);
    } catch (err) {
      setError(formatError(err, "Não foi possível entrar. Confira as credenciais e a configuração do backend."));
    } finally {
      setLoginBusy(false);
    }
  }

  useEffect(() => {
    if (logged) void load();
    // load is intentionally called when the login state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged]);

  async function changeStatus(id: number, newStatus: string) {
    setNotice("");
    try {
      await apiRequest<Order>(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
      setNotice("Status do pedido atualizado.");
    } catch (err) {
      setError(formatError(err, "Erro ao atualizar o pedido."));
    }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await apiRequest<Product>(editing ? `/api/admin/products/${editing}` : "/api/admin/products", {
        method: editing ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      setForm(emptyForm);
      setEditing(null);
      await load();
      setNotice(editing ? "Produto atualizado com sucesso." : "Produto criado com sucesso.");
    } catch (err) {
      setError(formatError(err, "Erro ao salvar o produto."));
    }
  }

  function logout() {
    setLogged(false);
    setU("");
    setP("");
    setOrders([]);
    setProducts([]);
    setError("");
    setNotice("");
  }

  if (!logged) {
    return (
      <main className="admin-login">
        <a href="/" className="admin-back">← Voltar para a loja</a>
        <form className="admin-login-card" onSubmit={login}>
          <span className="brand-mark">F.</span>
          <p className="eyebrow red">ÁREA RESTRITA</p>
          <h1>Painel do Forno.</h1>
          <p>Acesse para gerenciar os pedidos e o cardápio.</p>
          <label>
            Usuário
            <input value={u} onChange={(event) => setU(event.target.value)} required autoComplete="username" />
          </label>
          <label>
            Senha
            <input type="password" value={p} onChange={(event) => setP(event.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="button button-dark full" disabled={loginBusy}>
            {loginBusy ? "Verificando…" : "Entrar no painel"}
          </button>
          <small>As credenciais são validadas pelo backend e não ficam embutidas no site público.</small>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/" className="brand"><span className="brand-mark">F.</span><span>FORNO <small>ADMINISTRAÇÃO</small></span></a>
        <div>
          <span className="admin-live"><i /> Painel conectado</span>
          <button className="icon-button" onClick={logout} aria-label="Sair"><LogOut /></button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-title">
          <div><p className="eyebrow red">CENTRAL DE OPERAÇÕES</p><h1>Bom trabalho.</h1><p>Gerencie o ritmo da casa, pedido por pedido.</p></div>
          <button className="refresh-button" onClick={() => void load()}><RefreshCw size={16} /> Atualizar</button>
        </div>
        {error && <p className="admin-message" role="alert">{error}</p>}
        {notice && <p className="admin-message" role="status">{notice}</p>}

        <div className="admin-stats">
          <div><span><ShoppingBag /> Pedidos</span><strong>{orders.length}</strong><small>Todos os pedidos registrados</small></div>
          <div><span><Package /> Em andamento</span><strong>{orders.filter((order) => !["Concluído", "Cancelado"].includes(order.status)).length}</strong><small>Precisam de atenção</small></div>
          <div><span><Pizza /> Produtos ativos</span><strong>{products.filter((product) => product.active).length}</strong><small>Itens no cardápio</small></div>
        </div>

        <div className="admin-tabs">
          <button className={tab === "orders" ? "selected" : ""} onClick={() => setTab("orders")}>Pedidos ({orders.length})</button>
          <button className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}>Cardápio ({products.length})</button>
        </div>

        {tab === "orders" ? (
          <div className="orders-list">
            {loading ? <p>Carregando pedidos…</p> : orders.length === 0 ? (
              <div className="admin-empty"><ShoppingBag size={28} /><h3>Nenhum pedido por enquanto</h3><p>Os pedidos de demonstração aparecerão aqui depois de serem enviados pelo site.</p></div>
            ) : orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-top">
                  <div><span className="order-number">PEDIDO #{String(order.id).padStart(4, "0")}</span><h3>{order.customer_name}</h3><p>{order.phone} · {order.order_type === "delivery" ? order.address : "Retirada no balcão"}</p></div>
                  <strong>{money(order.total)}</strong>
                </div>
                <div className="order-items">{order.items.map((item) => <span key={item.id}>{item.quantity}× {item.product_name}</span>)}{order.notes && <p>Observação: {order.notes}</p>}</div>
                <div className="order-payment-line">
                  <span>Pagamento: <strong>{order.payment_status === "approved" ? "Aprovado" : order.payment_status === "pending" ? "Pendente" : order.payment_status === "rejected" ? "Recusado" : order.payment_status === "pay_on_delivery" ? "Na entrega/retirada (demonstração)" : "Não informado"}</strong></span>
                  <a href={`/acompanhar/${order.tracking_token}`} target="_blank" rel="noreferrer">Ver acompanhamento ↗</a>
                </div>
                <div className="order-card-bottom">
                  <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                  <select value={order.status} onChange={(event) => void changeStatus(order.id, event.target.value)} aria-label={`Status pedido ${order.id}`}>
                    {statuses.map((itemStatus) => <option key={itemStatus}>{itemStatus}</option>)}
                  </select>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="products-admin">
            <form className="product-form" onSubmit={saveProduct}>
              <h2>{editing ? "Editar produto" : "Novo produto"}</h2>
              <label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <div className="form-two">
                <label>Categoria<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{["Clássicas", "Especiais", "Autorais", "Sobremesas", "Bebidas"].map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Preço (R$)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
              </div>
              <label>URL da imagem<input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://…" /></label>
              <label>Selo curto<input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="Ex.: Favorita" /></label>
              <label className="admin-active-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Produto ativo no cardápio</label>
              <button className="button button-dark full">{editing ? "Salvar alterações" : "Adicionar ao cardápio"}</button>
              {editing && <button type="button" className="refresh-button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancelar edição</button>}
            </form>
            <div className="product-admin-list">
              <h2>Produtos cadastrados</h2>
              {products.map((product) => (
                <div className="product-admin-row" key={product.id}>
                  <div><strong>{product.name}</strong><span>{product.category} · {money(product.price)}</span></div>
                  <div className="product-admin-actions">
                    <span className={product.active ? "active-pill" : "inactive-pill"}>{product.active ? "Ativo" : "Inativo"}</span>
                    <button type="button" className="edit-product" onClick={() => { setEditing(product.id); setForm({ name: product.name, description: product.description, category: product.category, price: String(product.price), image: product.image, badge: product.badge, active: product.active }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
