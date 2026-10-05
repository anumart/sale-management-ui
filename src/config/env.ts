/** Typed access to Vite env variables (see .env.example) */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  useMock: (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false',
}
