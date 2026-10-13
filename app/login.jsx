import { useRef, useState } from 'react'
import { Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SketchView as View } from '../src/components/Sketch'
import Field from '../src/components/Field'
import Button from '../src/components/Button'
import { adminLogin } from '../src/services/auth'
import { apiMessage } from '../src/services/api'
import { BASE_URL, IS_PROD } from '../src/services/config'
import { permissionStatus, registerForPush } from '../src/services/push'
import { setUnlocked, takePendingTab } from '../src/state/session'
import { colors, fonts, fontSize, spacing } from '../src/styles/tokens'

// Same as the web Admin (billtable-admin/src/screens/Login.jsx): the admin
// password and the 6-digit code from the authenticator app, sent together
// in ONE request to POST /api/auth/admin-login.
export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reason } = useLocalSearchParams()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const codeRef = useRef(null)

  const canSubmit = password.length > 0 && code.length === 6 && !loading

  const submit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await adminLogin(password, code)
      setUnlocked(true)
      setPassword('')
      const tab = takePendingTab()
      // First time on this phone (or alerts never set up): explain push
      // before iOS asks.
      const perm = Platform.OS === 'web' ? 'denied' : await permissionStatus()
      if (perm !== 'granted' && Platform.OS !== 'web') router.replace('/notifications')
      else router.replace(tab === 'alerts' ? '/(tabs)/alerts' : '/(tabs)/health')
      if (perm === 'granted') {
        // Already allowed: (re)register this phone quietly.
        registerForPush({ ask: false }).catch(() => {})
      }
    } catch (e) {
      setCode('')
      if (e?.response?.status === 429) setError('Too many tries. Wait a few minutes, then try again.')
      else setError(apiMessage(e, 'Could not sign in. Check the password and the code.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>TigTagTrue</Text>
        <Text style={styles.sub}>Admin · for the owner only</Text>

        {reason === 'signed-out' ? <Text style={styles.notice}>Your admin session ended. Please sign in again.</Text> : null}

        <View style={styles.card}>
          <Field
            label="Admin password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            testID="password"
          />
          <Field
            ref={codeRef}
            label="6-digit code from your authenticator app"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={styles.codeWrap}
            inputStyle={styles.code}
            onSubmitEditing={submit}
            testID="code"
          />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={!canSubmit} loading={loading} style={styles.btn} />
        </View>

        <Text style={styles.foot}>
          The code changes every 30 seconds. Use the same authenticator app as the web Admin.
        </Text>
        {!IS_PROD ? <Text style={styles.dev}>Test server: {BASE_URL}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  logo: { fontFamily: fonts.brand, fontSize: 56, color: colors.ink, textAlign: 'center', lineHeight: 62 },
  sub: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: colors.pencil, textAlign: 'center', marginBottom: spacing.lg },
  notice: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  card: { borderWidth: 2, borderColor: colors.ink, borderRadius: 16, padding: spacing.sm },
  codeWrap: { marginTop: spacing.xs },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: '#B3261E', marginBottom: spacing.xs },
  btn: { marginTop: spacing.xs },
  foot: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, textAlign: 'center', marginTop: spacing.md },
  dev: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: '#8A5A00', textAlign: 'center', marginTop: spacing.xs },
})
