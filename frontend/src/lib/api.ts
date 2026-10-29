export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export type Product = { id: number; name: string; description: string; category: string; price: number; image: string; badge: string; active: boolean };
export type CartItem = { product: Product; quantity: number };
export type OrderItem = { id: number; product_id: number; product_name: string; quantity: number; unit_price: number };
export type Order = { id: number; customer_name: string; phone: string; order_type: string; address: string; notes: string; status: string; total: number; payment_status: string; payment_provider_order_id?: string | null; tracking_token: string; created_at: string; items: OrderItem[] };

export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function request(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(`Não foi possível conectar à API (\${API_URL}). Confira se NEXT_PUBLIC_API_URL está configurada na Vercel e se o serviço do Render está ativo.`);
  }
}

export async function getProducts(): Promise<Product[]> {
  const response = await request(`\${API_URL}/api/products`, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o cardápio.");
  return response.json();
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/\${path}`;
  const response = await request(`\${API_URL}\${normalizedPath}`, options);
  if (!response.ok) {
    let message = `A API respondeu com erro (HTTP \${response.status}).`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
    } catch {
      // Some proxies return an HTML error page instead of JSON.
    }
    throw new Error(message);
  }
  return response.json();
}
