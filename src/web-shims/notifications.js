// WEB ONLY: no push in a browser (push is for the iPhone app). The web
// export exists for local testing and screenshots.
const noopSub = { remove() {} }
export const AndroidImportance = { HIGH: 4, DEFAULT: 3, MAX: 5 }
export const AndroidNotificationVisibility = { PUBLIC: 1, PRIVATE: 0, SECRET: -1 }
export function setNotificationHandler() {}
export async function setNotificationChannelAsync() {}
export async function getPermissionsAsync() { return { status: 'denied', canAskAgain: false } }
export async function requestPermissionsAsync() { return { status: 'denied', canAskAgain: false } }
export async function getExpoPushTokenAsync() { throw new Error('Push is only available in the iPhone app.') }
export async function getLastNotificationResponseAsync() { return null }
export async function setBadgeCountAsync() { return true }
export function addNotificationReceivedListener() { return noopSub }
export function addNotificationResponseReceivedListener() { return noopSub }
