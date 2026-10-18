import type { z } from 'zod'
import type { configSchema } from '../configSchema'

export type AppConfig = z.infer<typeof configSchema>
