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

export type WelcomeProps = {
  userName: string;
  dashboardUrl?: string;
  supportUrl?: string;
};

export function Welcome({
  userName,
  dashboardUrl = '/dashboard',
  supportUrl = 'https://example.com/support',
}: WelcomeProps) {
  const previewText = `Welcome to Authentication Boilerplate, ${userName}!`;

  return (
    <EmailLayout>
      <EmailBody>
        <EmailPreview text={previewText} />
        <EmailContainer>
          <EmailHeader />

          <EmailHeading level={1} align="center">
            Welcome!
          </EmailHeading>

          <EmailText size="lg">
            Hi
            {' '}
            {userName}
            ,
          </EmailText>

          <EmailText>
            Thank you for joining! Your account is now verified and ready to use.
            You can now access your secure dashboard.
          </EmailText>

          <EmailSection align="center" spacing="lg">
            <EmailButton href={dashboardUrl} variant="primary" size="lg">
              Go to Dashboard
            </EmailButton>
          </EmailSection>

          <EmailDivider />

          <EmailHeading level={3}>
            Getting Started
          </EmailHeading>

          <EmailCard>
            <EmailText weight="semibold">Here's what you can do:</EmailText>
            <EmailText size="sm" color="secondary">
              • View and manage your billing information
              <br />
              • Track your subscription and usage
              <br />
              • Update payment methods
              <br />
              • Download invoices and receipts
            </EmailText>
          </EmailCard>

          <EmailText align="center" size="sm" color="secondary">
            Need help? Visit our support center at
            {' '}
            {supportUrl}
            {' '}
            or reply to this email.
          </EmailText>

          <EmailFooter
            privacyUrl="https://example.com/privacy"
            termsUrl="https://example.com/terms"
          />
        </EmailContainer>
      </EmailBody>
    </EmailLayout>
  );
}

Welcome.PreviewProps = {
  userName: 'Alex Morgan',
  dashboardUrl: 'https://example.com/dashboard',
  supportUrl: 'https://example.com/support',
} as WelcomeProps;

export default Welcome;
