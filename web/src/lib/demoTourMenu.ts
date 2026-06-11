let openMenu: (() => void) | null = null
let closeMenu: (() => void) | null = null

export function registerDemoTourMenu(open: () => void, close: () => void) {
  openMenu = open
  closeMenu = close
}

export function unregisterDemoTourMenu() {
  openMenu = null
  closeMenu = null
}

export function demoTourOpenMenu() {
  openMenu?.()
}

export function demoTourCloseMenu() {
  closeMenu?.()
}
