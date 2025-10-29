import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../src/server/trpc'

// Create tRPC React hooks with the AppRouter type
export const trpc = createTRPCReact<AppRouter>()

// tRPC client configuration
export const trpcClientConfig = {
  links: [
    // Add links here for authentication, logging, etc.
  ],
}

// Export the client for direct usage if needed
export { type AppRouter }