export interface NavigationSubItem {
  title: string;
  href: string;
  metadata?: string;
}

export interface NavigationItem {
  type: string;
  title: string;
  href: string;
  subitems?: NavigationSubItem[];
}
