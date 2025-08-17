import {
  EmailBody,
  EmailButton,
  EmailContainer,
  EmailFooter,
  EmailHeader,
  EmailHeading,
  EmailLayout,
  EmailLink,
  EmailPreview,
  EmailSection,
  EmailText,
} from '@/emails/components';

type EmailVerificationProps = {
  userName?: string;
  verificationUrl: string;
  expirationTime?: string;
};

export function EmailVerification({
  userName,
  verificationUrl,
  expirationTime = '24 hours',
}: EmailVerificationProps) {
  const previewText = userName
    ? `Welcome ${userName}! Please verify your email address`
    : 'Please verify your email address';

  return (
    <EmailLayout>
      <EmailBody>
        <EmailPreview text={previewText} />
        <EmailContainer>
          <EmailHeader />

          <EmailHeading level={1}>
            Welcome to
            {' '}
            <strong>Billing Dashboard</strong>
          </EmailHeading>

          <EmailText>
            {userName ? `Hello ${userName},` : 'Hello,'}
          </EmailText>

          <EmailText>
            Thank you for signing up! To get started with your billing dashboard, we need to verify your email address.
          </EmailText>

          <EmailSection align="center">
            <EmailButton href={verificationUrl} variant="primary" size="lg">
              Verify Email Address
            </EmailButton>
          </EmailSection>

          <EmailText>
            This verification link will expire in
            {' '}
            {expirationTime}
            . If you did not create an account with us, please ignore this email.
          </EmailText>

          <EmailText>
            Or copy and paste this URL into your browser:
            {' '}
            <EmailLink href={verificationUrl}>
              {verificationUrl}
            </EmailLink>
          </EmailText>

          <EmailFooter />
        </EmailContainer>
      </EmailBody>
    </EmailLayout>
  );
}

EmailVerification.PreviewProps = {
  userName: 'Alex Morgan',
  verificationUrl: 'https://example.com/verify-email?token=abc123',
  expirationTime: '24 hours',
} as EmailVerificationProps;

export default EmailVerification;
