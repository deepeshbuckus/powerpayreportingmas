/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POWERPAY_API_URL: string
  readonly VITE_POWERPAY_BEARER_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
