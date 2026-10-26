export interface User {
  id: number
  name: string
  email: string
  role: string
  /** Temporary gate for /settings until system roles are designed */
  isAdmin: boolean
  avatarUrl: string
}
