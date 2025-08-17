import { EmailLink } from '../content/email-link';
import { EmailText } from '../content/email-text';

type UnsubscribeFooterProps = {
  recipientEmail?: string;
  unsubscribeUrl?: string;
  senderIp?: string;
  senderLocation?: string;
  className?: string;
};

export function UnsubscribeFooter({
  recipientEmail,
  unsubscribeUrl,
  senderIp,
  senderLocation,
  className,
}: UnsubscribeFooterProps) {
  return (
    <EmailText size="sm" color="muted" className={className}>
      {recipientEmail && (
        <>
          This email was intended for
          {' '}
          <span className="text-black">{recipientEmail}</span>
          .
          {' '}
        </>
      )}

      {senderIp && senderLocation && (
        <>
          This email was sent from
          {' '}
          <span className="text-black">{senderIp}</span>
          {' '}
          located in
          {' '}
          <span className="text-black">{senderLocation}</span>
          .
          {' '}
        </>
      )}

      If you were not expecting this email, you can ignore it.
      {' '}

      {unsubscribeUrl && (
        <>
          You can also
          {' '}
          <EmailLink href={unsubscribeUrl} color="muted">
            unsubscribe from these emails
          </EmailLink>
          .
          {' '}
        </>
      )}

      If you are concerned about your account's safety, please reply to this email to get in touch with us.
    </EmailText>
  );
}
