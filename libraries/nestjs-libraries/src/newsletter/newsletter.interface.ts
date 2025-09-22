export interface NewsletterInterface {
  name: string;
  register(email: string): Promise<void>;
}