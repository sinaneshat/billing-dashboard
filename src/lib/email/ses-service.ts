import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { render } from '@react-email/render';

import { BRAND } from '@/constants';

type EmailConfig = {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  fromEmail?: string;
  replyToEmail?: string;
};

class EmailService {
  private sesClient: SESClient | null = null;
  private fromEmail: string;
  private replyToEmail: string;

  constructor(config?: EmailConfig) {
    const accessKeyId = config?.accessKeyId || process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = config?.secretAccessKey || process.env.AWS_SES_SECRET_ACCESS_KEY;
    const region = config?.region || process.env.NEXT_PUBLIC_AWS_SES_REGION || 'us-east-1';

    if (accessKeyId && secretAccessKey) {
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    this.fromEmail = config?.fromEmail || process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@example.com';
    this.replyToEmail = config?.replyToEmail || process.env.NEXT_PUBLIC_SES_REPLY_TO_EMAIL || this.fromEmail;
  }

  private async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }) {
    if (!this.sesClient) {
      // Email service not configured, skip silently
      return;
    }

    const toAddresses = Array.isArray(to) ? to : [to];

    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ReplyToAddresses: [this.replyToEmail],
    });

    const response = await this.sesClient.send(command);
    // Email sent successfully
    return response;
  }

  async sendMagicLink(to: string, magicLink: string) {
    // Dynamic import to avoid Next.js build issues with React Email components
    const { MagicLink } = await import('@/emails/templates');

    const html = await render(MagicLink({
      loginUrl: magicLink,
    }));
    const text = `Sign in to ${BRAND.name} using this link: ${magicLink}`;

    return this.sendEmail({
      to,
      subject: `Your sign-in link - ${BRAND.name}`,
      html,
      text,
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Also export the class for testing or custom configurations
export { EmailService };
