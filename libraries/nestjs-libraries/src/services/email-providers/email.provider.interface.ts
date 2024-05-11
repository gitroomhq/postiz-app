export interface EmailProvider {
    sendEmail(to: string, subject: string, html: string): Promise<void>;
}