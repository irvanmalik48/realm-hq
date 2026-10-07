export interface OAuthAccountDTO {
  provider: string;
  email?: string;
  avatar_url?: string;
}

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  provider: string;
  two_factor_enabled: boolean;
  has_password: boolean;
  is_active: boolean;
  connected_providers: string[];
  connected_accounts: OAuthAccountDTO[];
  created_at: string;
  updated_at: string;
}

export interface ListUsersResponse {
  status: string;
  users: UserDTO[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchUsers(params?: {
  search?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}): Promise<ListUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.provider) searchParams.set("provider", params.provider);
  if (params?.limit !== undefined)
    searchParams.set("limit", params.limit.toString());
  if (params?.offset !== undefined)
    searchParams.set("offset", params.offset.toString());

  const res = await fetch(`/api/users?${searchParams.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error || `Failed to fetch users (${res.status})`,
    );
  }

  return res.json();
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    full_name?: string;
    email?: string;
    is_active?: boolean;
  },
): Promise<{ status: string; user: UserDTO }> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error || `Failed to update user (${res.status})`,
    );
  }

  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error || `Failed to delete user (${res.status})`,
    );
  }
}
