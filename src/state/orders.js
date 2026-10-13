// The newest orders the Orders tab loaded, kept so the detail screen can
// open instantly without asking the server again (the list is read-only).
const byId = new Map()

export function rememberOrders(list) {
  byId.clear()
  for (const o of list || []) byId.set(String(o.id), o)
}

export function orderById(id) {
  return byId.get(String(id)) || null
}
