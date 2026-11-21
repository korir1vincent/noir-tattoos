// const nodemailer = require('nodemailer');

// async function sendEmail({ to, subject, text, html }) {
//   if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !to) {
//     console.log(`[email skipped] ${subject} -> ${to || '(no recipient)'}`);
//     return;
//   }
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT || 587),
//     secure: Number(process.env.SMTP_PORT) === 465,
//     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//   });
//   await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
// }
// async function bookingNotice(booking, subject, message) {
//   await Promise.all([
//     sendEmail({ to: booking.customer.email, subject, text: message }),
//     sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, subject: `New studio activity: ${subject}`, text: message })
//   ]);
// }
// module.exports = { sendEmail, bookingNotice };





const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !to
  ) {
    console.log(`[email skipped] ${subject} -> ${to || '(no recipient)'}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });
}

async function bookingNotice(booking, subject, message) {
  const emails = [
    {
      to: booking.customer.email,
      subject,
      text: message
    },
    {
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `New studio activity: ${subject}`,
      text: message
    }
  ];

  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[email error] Failed to send ${index === 0 ? 'customer' : 'admin'} notification:`,
        result.reason.message
      );
    }
  });
}

module.exports = {
  sendEmail,
  bookingNotice
};