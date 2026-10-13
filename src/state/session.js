// Small bits of app-wide state that are not worth a store:
//  - pendingTab: a notification was tapped; open this tab once signed in /
//    unlocked.
//  - unlocked: Face ID passed in this run of the app (the lock only shows
//    when the app is opened with a saved session, not after a fresh login).
let pendingTab = null
let unlocked = false

export function setPendingTab(tab) {
  pendingTab = tab
}
export function takePendingTab() {
  const t = pendingTab
  pendingTab = null
  return t
}
export function setUnlocked(v) {
  unlocked = !!v
}
export function isUnlocked() {
  return unlocked
}
