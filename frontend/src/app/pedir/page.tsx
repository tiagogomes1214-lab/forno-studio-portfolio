import type { Metadata } from "next";
import Storefront from "@/components/Storefront";

export const metadata: Metadata = {
  title: "Faça seu pedido",
  description: "Escolha suas pizzas artesanais, revise o carrinho e acompanhe seu pedido.",
};

export default function PedirPage() {
  return <Storefront />;
}
