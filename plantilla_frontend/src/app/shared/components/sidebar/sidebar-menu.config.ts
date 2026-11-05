export type IconType = 'bootstrap' | 'material';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  iconType?: IconType;
  route?: string;
  children?: MenuItem[];
  permissions?: string[];
  expanded?: boolean;
}

/** Menú inicial de la plantilla; las nuevas features deben registrarse aquí. */
export const SIDEBAR_MENU_CONFIG: MenuItem[] = [
  {
    id: 'profile',
    label: 'Mi perfil',
    icon: 'person',
    iconType: 'material',
    route: '/profile',
  },
];

export function getMenuItemById(id: string): MenuItem | undefined {
  return SIDEBAR_MENU_CONFIG.find(item => item.id === id);
}

export function expandMenuForRoute(route: string): void {
  const cleanRoute = route.split('?')[0].split('#')[0];
  for (const item of SIDEBAR_MENU_CONFIG) {
    if (item.children?.some(child => cleanRoute === child.route || cleanRoute.startsWith(`${child.route}/`))) {
      item.expanded = true;
    }
  }
}

export function getParentItemForRoute(route: string): MenuItem | null {
  const cleanRoute = route.split('?')[0].split('#')[0];
  return SIDEBAR_MENU_CONFIG.find(item =>
    item.children?.some(child => child.route && (cleanRoute === child.route || cleanRoute.startsWith(`${child.route}/`))),
  ) ?? null;
}
