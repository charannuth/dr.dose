import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useAuth } from '../hooks/useAuth'
import { useVault } from '../hooks/useVault'
import { VAULT_ENFORCEMENT_ENABLED } from '../lib/crypto/flags'

/**
 * Blocks health UI until the silent vault is unlocked.
 * Normal path: auth unlocks with login password (no passphrase form).
 * One-time: save account backup. After password reset: restore with backup.
 */
export function VaultGate({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const vault = useVault()
  const [mnemonic, setMnemonic] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [backupSaved, setBackupSaved] = useState(false)

  if (!VAULT_ENFORCEMENT_ENABLED) {
    return <>{children}</>
  }

  if (vault.status === 'unlocked') {
    return (
      <>
        {children}
        {vault.migrating ? (
          <View style={styles.banner} pointerEvents="none">
            <Text style={styles.bannerText}>Securing your health data…</Text>
          </View>
        ) : null}
        {vault.recoveryMnemonicOnce ? (
          <View style={styles.modal}>
            <ScrollView contentContainerStyle={styles.modalInner}>
              <Text style={styles.title}>Save your account backup</Text>
              <Text style={styles.body}>
                Dr. Dose locks your health details so only you can open them. Save this
                backup in Notes or email it to yourself. You need it only if you forget
                your password and reset it. We cannot recover it for you.
              </Text>
              <Text style={styles.mnemonic} selectable>
                {vault.recoveryMnemonicOnce}
              </Text>
              <Pressable
                style={styles.secondary}
                onPress={async () => {
                  await Clipboard.setStringAsync(vault.recoveryMnemonicOnce!)
                  setBackupSaved(true)
                }}
              >
                <Text style={styles.secondaryText}>Copy backup</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={async () => {
                  await Share.share({ message: vault.recoveryMnemonicOnce! })
                  setBackupSaved(true)
                }}
              >
                <Text style={styles.secondaryText}>Share…</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, !backupSaved && styles.primaryDisabled]}
                disabled={!backupSaved}
                onPress={() => {
                  vault.clearRecoveryMnemonic()
                  setBackupSaved(false)
                }}
              >
                <Text style={styles.primaryText}>I’ve saved it — Continue</Text>
              </Pressable>
              {!backupSaved ? (
                <Text style={styles.hint}>Copy or Share once to continue.</Text>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </>
    )
  }

  if (vault.status === 'loading' || vault.status === 'locked') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.hint}>Preparing secure storage…</Text>
      </View>
    )
  }

  // needs_setup: should be rare if auth created the vault; prompt sign-out
  if (vault.status === 'needs_setup') {
    return (
      <View style={styles.centerPad}>
        <Text style={styles.brand}>Dr. Dose</Text>
        <Text style={styles.title}>Almost ready</Text>
        <Text style={styles.body}>
          Sign out and sign back in with your password so we can finish securing your
          health data. This only takes a moment.
        </Text>
        {vault.error ? <Text style={styles.error}>{vault.error}</Text> : null}
        <Pressable
          style={styles.secondary}
          onPress={() => {
            void signOut()
          }}
        >
          <Text style={styles.secondaryText}>Sign out</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => {
            void vault.refresh()
          }}
        >
          <Text style={styles.secondaryText}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  // needs_unlock: typically after password reset — restore with account backup
  const err = localError || vault.error

  async function onRestore() {
    setLocalError(null)
    setBusy(true)
    try {
      await vault.recover(mnemonic.trim())
      setMnemonic('')
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not restore')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.centerPad}>
      <Text style={styles.brand}>Dr. Dose</Text>
      <Text style={styles.title}>Restore with account backup</Text>
      <Text style={styles.body}>
        Your login password was updated, so we need your account backup to reopen your
        health history. Paste the words you saved when you first signed up.
      </Text>
      <Text style={styles.label}>Account backup</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={mnemonic}
        onChangeText={setMnemonic}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        placeholder="word1 word2 word3 …"
        placeholderTextColor="#94a3b8"
      />
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <Pressable
        style={[styles.primary, busy && styles.primaryDisabled]}
        disabled={busy || mnemonic.trim().length < 10}
        onPress={() => void onRestore()}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Restore health data</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  centerPad: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0891b2',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#0f172a',
    marginBottom: 12,
  },
  inputMulti: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: '#0891b2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: { color: '#0891b2', fontWeight: '600', fontSize: 15 },
  hint: { marginTop: 10, color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626', marginBottom: 8, fontSize: 14 },
  banner: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(8,145,178,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bannerText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalInner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  mnemonic: {
    fontFamily: 'Courier',
    fontSize: 15,
    lineHeight: 24,
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
})
