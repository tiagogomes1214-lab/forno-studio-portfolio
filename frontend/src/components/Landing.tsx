"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Clock3, Flame, Leaf, MoveUpRight, Sparkles } from "lucide-react";

export default function Landing() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".landing-reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.13, rootMargin: "0px 0px -35px 0px" });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="landing-logo" aria-label="Forno Studio, início"><span className="landing-logo-mark">F.</span><span>FORNO <small>STUDIO PIZZERIA</small></span></Link>
        <nav aria-label="Navegação principal" className="landing-links">
          <a href="#conceito">Nossa essência</a>
          <a href="#experiencia">A experiência</a>
        </nav>
        <Link href="/pedir" className="landing-order">FAÇA SEU PEDIDO <ArrowUpRightIcon /></Link>
      </header>
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <div className="demo-banner" role="note"><strong>Site demonstrativo de portfólio.</strong> Não informe dados reais. Nenhum pedido será preparado ou entregue.</div>}
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-photo" aria-hidden="true" />
        <div className="landing-hero-wash" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-kicker"><span /> O RITUAL DA PIZZA ARTESANAL</p>
          <h1 id="landing-title">O sabor<br />tem seu <em>tempo.</em></h1>
          <p className="landing-lead">Massa de longa fermentação. Ingredientes escolhidos a dedo. Um convite para aproveitar cada fatia.</p>
          <div className="landing-hero-actions">
            <Link href="/pedir" className="landing-primary">EXPLORAR O CARDÁPIO <ArrowRight size={17}/></Link>
            <a href="#conceito" className="landing-ghost">CONHEÇA NOSSA HISTÓRIA <ArrowDownRight size={18}/></a>
          </div>
        </div>
        <div className="landing-hero-meta"><span>FEITO COM TEMPO. SERVIDO COM ALMA.</span><span>01 / 03</span></div>
        <div className="landing-hero-seal"><span>FERMENTAÇÃO</span><strong>48<span>h</span></strong><span>DE PACIÊNCIA</span></div>
      </section>
      <section className="landing-statement landing-reveal" id="conceito">
        <p className="landing-section-kicker">01 / NOSSO JEITO DE FAZER</p>
        <h2>Mais do que pizza.<br /><em>Um momento.</em></h2>
        <p>O melhor ingrediente não vem em uma embalagem. É o cuidado por trás de cada escolha: do preparo da massa ao instante em que a pizza chega à mesa.</p>
        <div className="landing-statement-line" />
      </section>
      <section className="landing-features" id="experiencia">
        <div className="landing-feature-image landing-reveal"><span>TRADIÇÃO & CRIATIVIDADE</span></div>
        <div className="landing-feature-content landing-reveal">
          <p className="landing-section-kicker">02 / NOSSA ESSÊNCIA</p>
          <h2>O simples,<br />feito de forma <em>extraordinária.</em></h2>
          <div className="landing-feature-list">
            <div><Clock3 size={21}/><span><strong>O tempo faz a diferença</strong><small>Fermentação lenta para uma massa cheia de personalidade.</small></span></div>
            <div><Leaf size={21}/><span><strong>Ingredientes de verdade</strong><small>Combinações equilibradas e sabores que se reconhecem.</small></span></div>
            <div><Flame size={21}/><span><strong>Feita com intenção</strong><small>Da receita ao forno, atenção a cada detalhe.</small></span></div>
          </div>
          <Link className="landing-text-link" href="/pedir">CONHECER NOSSAS PIZZAS <MoveUpRight size={17}/></Link>
        </div>
      </section>
      <section className="landing-close landing-reveal">
        <div className="landing-close-inner">
          <p className="landing-section-kicker"><Sparkles size={14}/> 03 / SEU PRÓXIMO MOMENTO</p>
          <h2>A próxima fatia<br />pode ser <em>sua.</em></h2>
          <p>Escolha seus sabores favoritos, monte seu pedido e acompanhe cada etapa de perto.</p>
          <Link href="/pedir" className="landing-primary">FAÇA SEU PEDIDO <ArrowRight size={18}/></Link>
        </div>
      </section>
      <footer className="landing-footer"><Link href="/" className="landing-logo"><span className="landing-logo-mark">F.</span><span>FORNO <small>STUDIO PIZZERIA</small></span></Link><span>© 2026 FORNO STUDIO · PROJETO DEMONSTRATIVO</span><Link href="/pedir">IR PARA O CARDÁPIO <ArrowRight size={15}/></Link></footer>
    </main>
  );
}
function ArrowUpRightIcon() { return <MoveUpRight size={17} aria-hidden="true" />; }
