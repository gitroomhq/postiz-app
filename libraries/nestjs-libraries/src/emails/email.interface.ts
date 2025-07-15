export interface EmailInterface {
  name: string;
  validateEnvKeys: string[];
  sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string,
    cc?: string | string[]
  ): Promise<any>;
}
