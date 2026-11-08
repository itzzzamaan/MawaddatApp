const nodemailer = require('nodemailer');

const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  return `${local.slice(0, 1)}***@${domain}`;
};

const getSender = () => process.env.EMAIL_FROM || process.env.SMTP_FROM;
const getReplyTo = () => process.env.EMAIL_REPLY_TO || undefined;

const getOtpMessage = (email, otp, purpose) => {
  const isPasswordReset = purpose === 'password-reset';
  return {
    to: email,
    subject: isPasswordReset ? 'Reset your Mawaddat password' : 'Your Mawaddat signup OTP',
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">${isPasswordReset ? 'Password reset code' : 'Your verification code'}</h2>
        <p>${isPasswordReset ? 'Use this code to reset your Mawaddat password.' : 'Use the code below to complete your signup.'}</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; margin: 18px 0; padding: 16px 20px; background: #f3f4f6; border-radius: 10px; display: inline-block;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };
};

const makeError = (code, message, extra = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
};

// Accepts "Name <address@domain>" or a bare address.
const parseSender = (value) => {
  const match = String(value || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { email: match[2].trim(), ...(match[1] ? { name: match[1].replace(/^"|"$/g, '') } : {}) };
  return { email: String(value || '').trim() };
};

const sendWithBrevo = async (message) => {
  const sender = parseSender(getSender());
  if (!sender.email) {
    throw makeError(
      'EMAIL_SENDER_NOT_CONFIGURED',
      'EMAIL_FROM must be a sender address validated in Brevo.',
    );
  }

  const replyTo = getReplyTo();
  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: message.to }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject: message.subject,
        htmlContent: message.html,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw makeError('EMAIL_PROVIDER_UNREACHABLE', 'Could not reach the email provider.', {
      cause: error.name,
    });
  }

  if (!response.ok) {
    // Brevo answers with { code, message }; the message never contains the API key.
    let detail = {};
    try {
      detail = await response.json();
    } catch {
      // Non-JSON error body.
    }
    throw makeError('EMAIL_PROVIDER_REJECTED', 'Email provider rejected the message.', {
      status: response.status,
      providerName: detail.code,
      providerMessage: detail.message,
    });
  }
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');

  if (!user || !pass) {
    throw makeError('SMTP_NOT_CONFIGURED', 'SMTP_USER and SMTP_PASS must be configured.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw makeError('SMTP_INVALID_PORT', 'SMTP_PORT must be a valid port number.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    // Fail fast: Render's free tier silently drops outbound SMTP, and nodemailer's
    // defaults (2 min connect / 10 min socket) would hang the request until timeout.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user, pass },
  });
};

const sendWithSmtp = async (message) => {
  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      // EMAIL_FROM is a Brevo sender; SMTP servers need their own (SMTP_FROM / login) address.
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      replyTo: getReplyTo(),
      ...message,
    });
  } finally {
    transporter.close();
  }
};

// Brevo (HTTPS, port 443) is preferred because Render's free plan blocks SMTP.
const sendOtpEmail = async (email, otp, purpose = 'signup') => {
  const message = getOtpMessage(email, otp, purpose);
  const provider = process.env.BREVO_API_KEY ? 'brevo' : 'smtp';

  if (provider === 'brevo') await sendWithBrevo(message);
  else await sendWithSmtp(message);

  console.info(`OTP email sent: provider=${provider} purpose=${purpose} to=${maskEmail(email)}`);
  return { provider };
};

// Maps a delivery failure to an HTTP status + user-facing message. Logs only
// non-sensitive diagnostics (never the OTP, API keys or passwords).
const getOtpDeliveryError = (error) => {
  const code = error.code || error.name || 'UnknownError';
  const details = [
    `code=${code}`,
    error.status ? `status=${error.status}` : '',
    error.providerName ? `provider_error=${error.providerName}` : '',
    error.providerMessage ? `provider_message="${error.providerMessage}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  console.error(`OTP email delivery failed: ${details}`);

  if (
    code === 'SMTP_NOT_CONFIGURED' ||
    code === 'SMTP_INVALID_PORT' ||
    code === 'EMAIL_SENDER_NOT_CONFIGURED'
  ) {
    return { status: 503, message: 'Email delivery is not configured correctly on the backend.' };
  }

  if (code === 'EMAIL_PROVIDER_REJECTED' && [400, 401, 403].includes(error.status)) {
    return {
      status: 503,
      message:
        'The email provider rejected the backend credentials or sender address. Check BREVO_API_KEY and that EMAIL_FROM is a validated Brevo sender.',
    };
  }

  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'EAI_AGAIN'].includes(code)) {
    return {
      status: 503,
      message:
        'The backend cannot reach its SMTP server. If hosted on Render Free, use an HTTPS email provider (BREVO_API_KEY) or a plan that allows SMTP.',
    };
  }

  return {
    status: 502,
    message: 'Unable to send the verification email. Check the backend email-provider settings and logs.',
  };
};

module.exports = { sendOtpEmail, getOtpDeliveryError, getOtpMessage, maskEmail };
