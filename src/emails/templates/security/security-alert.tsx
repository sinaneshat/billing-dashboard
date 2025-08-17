import {
  EmailBody,
  EmailButton,
  EmailCard,
  EmailContainer,
  EmailDivider,
  EmailFooter,
  EmailHeader,
  EmailHeading,
  EmailLayout,
  EmailPreview,
  EmailSection,
  EmailText,
} from '@/emails/components';

type SecurityAlertType = 'login' | 'suspicious_activity' | 'password_change' | 'email_change' | 'account_locked';

export type SecurityAlertProps = {
  alertType: SecurityAlertType;
  userName: string;
  timestamp: string;
  ipAddress: string;
  location?: string;
  deviceInfo?: string;
  secureAccountUrl: string;
  supportUrl?: string;
};

export function SecurityAlert({
  alertType,
  userName,
  timestamp,
  ipAddress,
  location = 'Unknown location',
  deviceInfo,
  secureAccountUrl,
  supportUrl = 'https://example.com/support',
}: SecurityAlertProps) {
  const alertTitles: Record<SecurityAlertType, string> = {
    login: 'New Sign-In Detected',
    suspicious_activity: 'Suspicious Activity Detected',
    password_change: 'Password Changed',
    email_change: 'Email Address Changed',
    account_locked: 'Account Locked',
  };

  const alertMessages: Record<SecurityAlertType, string> = {
    login: 'A new sign-in to your account was detected.',
    suspicious_activity: 'We detected unusual activity on your account.',
    password_change: 'Your password has been successfully changed.',
    email_change: 'Your email address has been updated.',
    account_locked: 'Your account has been locked due to multiple failed login attempts.',
  };

  const title = alertTitles[alertType];
  const message = alertMessages[alertType];
  const previewText = `Security Alert: ${title}`;

  return (
    <EmailLayout>
      <EmailBody>
        <EmailPreview text={previewText} />
        <EmailContainer>
          <EmailHeader />

          <EmailHeading level={1} align="center">
            Security Alert
          </EmailHeading>

          <EmailText>
            Hi
            {' '}
            {userName}
            ,
          </EmailText>

          <EmailText>
            {message}
          </EmailText>

          <EmailCard>
            <EmailText>Activity Details:</EmailText>
            <EmailDivider />

            <EmailText>
              Time:
              {timestamp}
            </EmailText>
            <EmailText>
              Location:
              {location}
            </EmailText>
            <EmailText>
              IP Address:
              {ipAddress}
            </EmailText>
            {deviceInfo && (
              <EmailText>
                Device:
                {deviceInfo}
              </EmailText>
            )}
          </EmailCard>

          <EmailSection>
            <EmailText>
              If this was you, no action is needed. If you don't recognize this activity,
              please secure your account immediately.
            </EmailText>
          </EmailSection>

          <EmailSection>
            <EmailButton href={secureAccountUrl}>
              Secure Your Account
            </EmailButton>
          </EmailSection>

          <EmailDivider />

          <EmailSection>
            <EmailHeading level={3}>
              Need Help?
            </EmailHeading>
            <EmailText>
              If you have any questions or concerns, please contact our support team.
            </EmailText>
            <EmailButton href={supportUrl}>
              Contact Support
            </EmailButton>
          </EmailSection>

          <EmailFooter />
        </EmailContainer>
      </EmailBody>
    </EmailLayout>
  );
}
