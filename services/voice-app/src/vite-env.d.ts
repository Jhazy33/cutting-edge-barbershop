/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_OLLAMA_API: string
    readonly VITE_GEMINI_API_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
