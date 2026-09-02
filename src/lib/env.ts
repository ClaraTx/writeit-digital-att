type AppEnv = 'sandbox' | 'production';

export const env = {
  mode: (import.meta.env.VITE_ENV || 'sandbox') as AppEnv,
  isSandbox:    import.meta.env.VITE_ENV === 'sandbox',
  isProduction: import.meta.env.VITE_ENV === 'production',
} as const;
