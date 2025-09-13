import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { render } from '@react-email/render';

import { BRAND } from '@/constants';
import {
  EmailVerification,
  MagicLink,
  SecurityAlert,
  Welcome,
} from '@/emails/templates';

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

  async sendWelcomeEmail(to: string, userName: string) {
    const html = await render(Welcome({
      userName,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }));
    const text = `Welcome to ${BRAND.name}, ${userName}!`;

    return this.sendEmail({
      to,
      subject: `Welcome to ${BRAND.name}!`,
      html,
      text,
    });
  }

  async sendEmailVerification(to: string, verificationUrl: string) {
    const html = await render(EmailVerification({ verificationUrl }));
    const text = `Please verify your email by visiting: ${verificationUrl}`;

    return this.sendEmail({
      to,
      subject: `Verify your email - ${BRAND.name}`,
      html,
      text,
    });
  }

  async sendMagicLink(to: string, magicLink: string) {
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

  async sendSecurityAlert(to: string, alertType: 'login' | 'suspicious_activity' | 'password_change' | 'email_change' | 'account_locked', details: Record<string, unknown>) {
    const html = await render(SecurityAlert({
      alertType,
      userName: (details.userName as string) || 'User',
      timestamp: (details.timestamp as string) || new Date().toISOString(),
      ipAddress: (details.ipAddress as string) || 'Unknown',
      location: details.location as string | undefined,
      deviceInfo: details.deviceInfo as string | undefined,
      secureAccountUrl: (details.secureAccountUrl as string) || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }));
    const text = `Security Alert: ${alertType}. Please check your account.`;

    return this.sendEmail({
      to,
      subject: `Security Alert - ${BRAND.name}`,
      html,
      text,
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Also export the class for testing or custom configurations
export { EmailService };
