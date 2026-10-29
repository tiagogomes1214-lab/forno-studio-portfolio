export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export type Product = { id:number; name:string; description:string; category:string; price:number; image:string; badge:string; active:boolean };
export type CartItem = { product:Product; quantity:number };
export type OrderItem = { id:number; product_id:number; product_name:string; quantity:number; unit_price:number };
export type Order = { id:number; customer_name:string; phone:string; order_type:string; address:string; notes:string; status:string; total:number; payment_status:string; payment_provider_order_id?:string|null; tracking_token:string; created_at:string; items:OrderItem[] };
export const money = (value:number) => value.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
export async function getProducts(): Promise<Product[]> { const r=await fetch(`${API_URL}/api/products`, {cache:"no-store"}); if(!r.ok) throw new Error("Não foi possível carregar o cardápio."); return r.json(); }
export async function apiRequest<T>(path:string, options:RequestInit = {}):Promise<T> { const r=await fetch(`${API_URL}${path}`, options); if(!r.ok){let msg="Não foi possível concluir a solicitação."; try{const data=await r.json();msg=data.detail || msg;}catch{} throw new Error(msg);} return r.json(); }
