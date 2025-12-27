// Email template styles matching reply. branding - Mobile Optimized
export const emailStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    background: #000000;
    color: #EDEDED;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background: #000000;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px 0;
  }
  .logo {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 0;
  }
  .card {
    background: #0A0A0A;
    border: 2px solid rgba(249, 115, 22, 0.3);
    border-radius: 24px;
    padding: 32px 24px;
    box-shadow: 0 20px 60px rgba(249, 115, 22, 0.15);
  }
  .title {
    font-size: 28px;
    font-weight: bold;
    color: #FFFFFF;
    margin-bottom: 20px;
    margin-top: 0;
    text-align: center;
    line-height: 1.3;
  }
  .text {
    color: #D4D4D8;
    font-size: 17px;
    line-height: 1.7;
    margin-bottom: 24px;
    text-align: center;
  }
  .otp-container {
    background: rgba(249, 115, 22, 0.12);
    border: 3px solid rgba(249, 115, 22, 0.4);
    border-radius: 20px;
    padding: 40px 20px;
    text-align: center;
    margin: 36px 0;
  }
  .otp-label {
    color: #F97316;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 16px;
    display: block;
  }
  .otp-code {
    font-size: 52px;
    letter-spacing: 4px;
    color: #F97316;
    font-weight: 900;
    font-family: 'Courier New', Consolas, monospace;
    text-shadow: 0 0 30px rgba(249, 115, 22, 0.4);
    display: block;
    margin: 20px 0;
    line-height: 1.2;
  }
  .otp-expire {
    color: #A1A1AA;
    font-size: 14px;
    margin-top: 16px;
    font-weight: 500;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
    color: #000000;
    padding: 18px 48px;
    border-radius: 14px;
    text-decoration: none;
    font-weight: 700;
    font-size: 17px;
    box-shadow: 0 12px 35px rgba(249, 115, 22, 0.4);
    transition: all 0.3s;
    margin: 24px 0;
  }
  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.4), transparent);
    margin: 32px 0;
  }
  .footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 32px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .footer-text {
    color: #71717A;
    font-size: 14px;
    line-height: 1.8;
  }
  .footer-brand {
    color: #52525B;
    font-size: 12px;
    margin-top: 12px;
  }
  .highlight {
    color: #F97316;
    font-weight: 700;
  }
  .steps {
    text-align: left;
    margin: 24px 0;
  }
  .step-item {
    color: #D4D4D8;
    font-size: 16px;
    margin-bottom: 12px;
    padding-left: 8px;
  }
  
  /* Mobile Responsiveness */
  @media only screen and (max-width: 600px) {
    .container {
      padding: 16px;
    }
    .card {
      padding: 28px 20px;
      border-radius: 20px;
    }
    .title {
      font-size: 24px;
    }
    .text {
      font-size: 16px;
    }
    .otp-code {
      font-size: 44px;
      letter-spacing: 2px;
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 16px;
    }
    .button {
      padding: 16px 40px;
      font-size: 16px;
      display: block;
      width: 100%;
      max-width: 280px;
      margin: 24px auto;
    }
    .otp-container {
      padding: 32px 16px;
    }
  }
`;

// Generate themed email HTML wrapper
export function generateEmailHtml(title: string, content: string) {
  const logoUrl = 'https://res.cloudinary.com/dtbjsqor8/image/upload/v1766412971/reply_logo_ipmwsc.png';
  const websiteUrl = 'https://www.tryreply.app';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>${title}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">
        <img src="${logoUrl}" alt="reply logo" class="logo" />
      </a>
    </div>
    ${content}
    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} reply. All rights reserved.<br/>
        Automate your YouTube engagement with ease.
      </p>
      <p class="footer-brand">
        You're receiving this email because you signed up for reply.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// OTP Verification Email Template
export function generateOTPEmail(otp: string, email: string) {
  const content = `
    <div class="card">
      <h1 class="title">Verify Your Email</h1>
      <p class="text">
        Thanks for signing up! To complete your registration and start automating your YouTube comments, please verify your email address using the code below:
      </p>
      
      <div class="otp-container">
        <span class="otp-label">Verification Code</span>
        <strong class="otp-code">${otp}</strong>
        <p class="otp-expire">This code expires in 10 minutes</p>
      </div>
      
      <p class="text" style="font-size: 15px; color: #A1A1AA;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  return generateEmailHtml('Verify Your Email', content);
}

// Welcome Email Template (after verification)
export function generateWelcomeEmail(name: string) {
  const connectUrl = 'https://www.tryreply.app/auth/connect-youtube';

  const content = `
    <div class="card">
      <h1 class="title">Welcome</h1>
      <p class="text">
        Hi ${name || 'there'}!<br/><br/>
        Your email has been verified successfully! You're now ready to start automating your YouTube comment replies.
      </p>
      
      <div class="divider"></div>
      
      <p class="text" style="font-weight: 600; color: #FFFFFF; margin-bottom: 16px;">
        Next Steps:
      </p>
      <div class="steps">
        <div class="step-item">1. Connect your YouTube channel</div>
        <div class="step-item">2. Set up your auto-reply keywords</div>
        <div class="step-item">3. Customize your reply templates</div>
        <div class="step-item">4. Watch the engagement roll in</div>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${connectUrl}" class="button">
          Connect YouTube Channel
        </a>
      </div>
      
      <p class="text" style="font-size: 14px; color: #71717A;">
        Need help? Just reply to this email - we're here to help!
      </p>
    </div>
  `;

  return generateEmailHtml('Welcome', content);
}

// Password Reset Email Template
export function generatePasswordResetEmail(resetUrl: string, email: string) {
  const content = `
    <div class="card">
      <h1 class="title">Reset Your Password</h1>
      <p class="text">
        We received a request to reset the password for your account associated with <strong style="color: #FFFFFF;">${email}</strong>.
      </p>
      
      <p class="text">
        Click the button below to choose a new password:
      </p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetUrl}" class="button">
          Reset Password
        </a>
      </div>
      
      <div class="divider"></div>
      
      <p class="text" style="font-size: 15px; color: #A1A1AA; text-align: left;">
        <strong style="color: #D4D4D8;">Security Tips:</strong><br/>
        • This link expires in 1 hour<br/>
        • If you didn't request this, you can safely ignore this email<br/>
        • Your password won't change until you click the link above
      </p>
      
      <p class="text" style="font-size: 13px; color: #71717A; margin-top: 24px; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <span style="color: #F97316;">${resetUrl}</span>
      </p>
    </div>
  `;

  return generateEmailHtml('Reset Your Password', content);
}
