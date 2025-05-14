export interface ProviderInterface {
  identifier: string;
  baseUrl: string;
  element: string;
  findIdentifier: (element: HTMLElement) => string;
  attachTo: string;
  style: 'dark' | 'light';
}
