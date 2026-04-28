export const appEnv = {
  title: import.meta.env.VITE_APP_TITLE || 'NEXUS-E320 HMI',
  env: import.meta.env.VITE_APP_ENV || 'development',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export default appEnv;
