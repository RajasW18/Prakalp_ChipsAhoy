'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(toEmail, otpCode) {
  // If no SMTP user is provided, simulate sending by logging to the console
  if (!process.env.SMTP_USER) {
    console.log(`\n======================================================`);
    console.log(`[MAILER] SMTP credentials missing. Simulating email send.`);
    console.log(`[MAILER] To: ${toEmail}`);
    console.log(`[MAILER] Subject: Your PPG Platform Login Code`);
    console.log(`[MAILER] OTP Code: ${otpCode}`);
    console.log(`======================================================\n`);
    return true;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PPG Platform" <noreply@ppg.local>',
    to: toEmail,
    subject: 'Your PPG Platform Login Code',
    text: `Your login code is: ${otpCode}\n\nIt expires in 5 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
        <h2>PPG Health Platform</h2>
        <p>Your one-time login code is:</p>
        <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #10b981; margin: 0;">${otpCode}</h1>
        </div>
        <p>This code expires in 5 minutes.</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] OTP sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[MAILER] Error sending email to ${toEmail}:`, err);
    throw new Error('Failed to send email. Please try again later.');
  }
}

module.exports = { sendOtpEmail };
