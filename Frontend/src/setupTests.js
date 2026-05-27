import { TextDecoder, TextEncoder } from 'util'

import '@testing-library/jest-dom'

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

// Mock para Vite env en Jest
Object.defineProperty(globalThis, 'import', {
    value: {
        meta: {
            env: {
                VITE_STORAGE_BASE_URL: 'http://localhost:9000',
            },
        },
    },
    writable: true,
});