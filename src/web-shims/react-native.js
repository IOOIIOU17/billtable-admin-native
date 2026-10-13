// WEB ONLY (see metro.config.js). Everything comes from react-native-web,
// except Alert.alert, which is a silent no-op in a browser: use the
// browser's own alert / confirm instead.
export * from 'react-native'

export const Alert = {
  alert(title, message, buttons) {
    const text = [title, message].filter(Boolean).join('\n\n')
    const list = Array.isArray(buttons) ? buttons : []
    if (list.length <= 1) {
      window.alert(text)
      list[0]?.onPress?.()
      return
    }
    const cancel = list.find((b) => b.style === 'cancel') || list[0]
    const action = list.find((b) => b !== cancel) || list[list.length - 1]
    if (window.confirm(text)) action?.onPress?.()
    else cancel?.onPress?.()
  },
}
