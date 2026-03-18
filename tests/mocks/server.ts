import { setupServer } from 'msw/node'
import { anthropicHandlers } from './handlers/anthropic'
import { instagramHandlers } from './handlers/instagram'

export const server = setupServer(...anthropicHandlers, ...instagramHandlers)
