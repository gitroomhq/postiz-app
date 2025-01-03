export interface EmailInterface {
  name: string;
  validateEnvKeys: string[];
  sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ): Promise<any>;
}
