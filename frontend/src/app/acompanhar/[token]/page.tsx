"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bike, CheckCircle2, ChefHat, Circle, Clock3, CreditCard, PackageCheck, RefreshCw, ShoppingBag } from "lucide-react";
import { API_URL, money } from "@/lib/api";

type TrackedItem = { id: number; product_id: number; product_name: string; quantity: number; unit_price: number };
type TrackedOrder = {
  id: number;
  status: string;
  payment_status: string;
  order_type: string;
  total: number;
  created_at: string;
  tracking_token: string;
  items: TrackedItem[];
};

function paymentLabel(status: string) {
  if (status === "approved") return "Pagamento aprovado";
  if (status === "pending") return "Aguardando confirmação do pagamento";
  if (status === "rejected") return "Pagamento não aprovado";
  if (status === "failed") return "Não foi possível iniciar o pagamento";
  if (status === "pay_on_delivery") return "Pagamento na entrega ou retirada";
  return "Pagamento não necessário ou não informado";
}

const steps = [
  { title: "Pedido recebido", description: "A pizzaria recebeu os detalhes do seu pedido.", icon: PackageCheck },
  { title: "Em preparo", description: "A cozinha está preparando suas pizzas.", icon: ChefHat },
  { title: "Saiu para entrega / pronto para retirada", description: "Seu pedido está quase chegando à mesa.", icon: Bike },
  { title: "Concluído", description: "Bom apetite! Esperamos que aproveite.", icon: CheckCircle2 },
];

function stepIndex(order: TrackedOrder) {
  if (order.status === "Aguardando pagamento" && order.payment_status !== "approved") return -1;
  if (order.status === "Concluído") return 3;
  if (order.status === "Saiu para entrega" || order.status === "Pronto para retirada") return 2;
  if (order.status === "Em preparo") return 1;
  if (order.status === "Cancelado") return -2;
  return 0;
}

export default function TrackOrderPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tracking/${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível carregar o pedido.");
      setOrder(data as TrackedOrder);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o pedido.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOrder();
    const interval = window.setInterval(() => void loadOrder(), 15000);
    return () => window.clearInterval(interval);
  }, [loadOrder]);

  const currentStep = order ? stepIndex(order) : -1;

  return (
    <main className="tracking-page">
      <header className="tracking-nav">
        <Link href="/" className="brand"><span className="brand-mark">F.</span><span>FORNO <small>STUDIO PIZZERIA</small></span></Link>
        <Link href="/" className="tracking-back"><ArrowLeft size={15} /> Voltar à loja</Link>
      </header>
      <section className="tracking-content">
        <p className="eyebrow red">ACOMPANHAMENTO DO PEDIDO</p>
        {loading && <div className="tracking-card tracking-message"><RefreshCw size={22} className="tracking-spin"/><h1>Buscando seu pedido...</h1><p>Estamos consultando as informações mais recentes.</p></div>}
        {!loading && error && <div className="tracking-card tracking-message"><ShoppingBag size={30}/><h1>Não encontramos esse pedido.</h1><p>{error}</p><Link className="button button-dark" href="/">Voltar à loja</Link></div>}
        {!loading && order && <>
          <div className="tracking-title-row">
            <div><h1>Pedido <em>#{String(order.id).padStart(4, "0")}</em></h1><p>Obrigado por pedir no Forno Studio. Acompanhe cada etapa por aqui.</p></div>
            <span className={`tracking-status ${order.status === "Concluído" ? "is-done" : order.status === "Cancelado" ? "is-cancelled" : ""}`}>{order.status}</span>
          </div>
          <div className="tracking-grid">
            <section className="tracking-card tracking-progress">
              <div className="tracking-card-heading"><div><p className="eyebrow red">ANDAMENTO</p><h2>{order.status === "Aguardando pagamento" && order.payment_status !== "approved" ? "Aguardando pagamento" : order.status === "Cancelado" ? "Pedido cancelado" : order.status === "Concluído" ? "Pedido concluído" : "Estamos cuidando do seu pedido"}</h2></div><Clock3 size={21}/></div>
              {order.status === "Cancelado" ? <p className="tracking-notice">Este pedido está cancelado. Entre em contato com a pizzaria em caso de dúvidas.</p> : order.status === "Aguardando pagamento" && order.payment_status !== "approved" ? <p className="tracking-notice">O pedido só deve seguir para preparo depois da confirmação do pagamento.</p> : <div className="tracking-timeline">{steps.map((step, index) => { const Icon = step.icon; const done = currentStep >= index; const active = currentStep === index; return <div key={step.title} className={`tracking-step ${done ? "completed" : ""} ${active ? "current" : ""}`}><div className="tracking-step-icon">{done ? <Icon size={18}/> : <Circle size={18}/>}</div><div className="tracking-step-text"><strong>{step.title}</strong><p>{order.order_type === "pickup" && index === 2 ? "Avisaremos quando estiver pronto para retirada." : step.description}</p></div>{active && <span className="tracking-now">AGORA</span>}</div>; })}</div>}
              <div className="tracking-refresh"><RefreshCw size={13}/> Atualização automática a cada 15 segundos {lastUpdated && <span>· Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}</div>
            </section>
            <aside className="tracking-card tracking-summary">
              <p className="eyebrow red">RESUMO DO PEDIDO</p>
              <div className="tracking-payment"><CreditCard size={18}/><span><strong>{paymentLabel(order.payment_status)}</strong><small>{order.payment_status === "pending" ? "O status muda após confirmação segura do provedor." : "Informação atual do pagamento."}</small></span></div>
              <div className="tracking-items">{order.items.map(item => <div key={item.id}><span>{item.quantity}× {item.product_name}</span><strong>{money(item.unit_price * item.quantity)}</strong></div>)}</div>
              <div className="tracking-total"><span>Total do pedido</span><strong>{money(order.total)}</strong></div>
              <p className="tracking-small">{order.order_type === "pickup" ? "Modalidade: retirada no balcão" : "Modalidade: entrega"}</p>
              <p className="tracking-small">Criado em {new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
            </aside>
          </div>
        </>}
      </section>
      <footer className="tracking-footer"><span>FORNO STUDIO PIZZERIA</span><span>FEITO COM TEMPO. SERVIDO COM CARINHO.</span></footer>
    </main>
  );
}
