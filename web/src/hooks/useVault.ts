import { useContext } from 'react'
import { VaultContext, type VaultContextValue } from '../context/vault-context'

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
