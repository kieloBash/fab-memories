export {}

export type AppRole = 'ADMIN' | 'COORDINATOR' | 'VENDOR' | 'CLIENT'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: AppRole
    }
  }
}
