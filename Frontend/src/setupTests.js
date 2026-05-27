import { TextDecoder, TextEncoder } from 'util'

import '@testing-library/jest-dom'

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

