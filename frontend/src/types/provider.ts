export interface Provider {
  id: string;
  key_name: string;
  label: string;
  apikey: string;
  api_base: string;
  provider: string;
  model: string;
  stream: boolean;
  api_mode: string;
  temperature: number | null;
  max_tokens: number | null;
  reasoning_effort: string | null;
  service_tier: string | null;
  connect_timeout: number;
  read_timeout: number;
  max_retries: number;
  extra_params: Record<string, unknown>;
  supports_vision: boolean;
  enabled: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export type ProviderCreate = Omit<Provider, 'id' | 'created_at' | 'updated_at'>;

export type ProviderUpdate = Partial<
  Omit<Provider, 'id' | 'key_name' | 'created_at' | 'updated_at'>
>;
