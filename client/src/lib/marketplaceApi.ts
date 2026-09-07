const TOKEN_KEY = "public_auth_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/marketplace${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Network error" }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export const marketplaceApi = {
  // Public
  getServices:      ()                          => request("GET",  "/services"),
  getService:       (id: string)                => request("GET",  `/services/${id}`),
  // Authenticated
  createOrder:      (data: any)                 => request("POST", "/orders", data),
  getMyOrders:      ()                          => request("GET",  "/orders/me"),
  getMyOrder:       (id: string)                => request("GET",  `/orders/${id}`),
  submitTransaction: (id: string, txId: string) => request("PUT",  `/orders/${id}/transaction`, { transactionId: txId }),
};
