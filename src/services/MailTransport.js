// Looking to send emails in production? Check out our Email API/SMTP product!
import nodemailer from 'nodemailer'
import { MailtrapTransport } from 'mailtrap';

const TOKEN = process.env.MAILTRAP_API_KEY;

// Looking to send emails in production? Check out our Email API/SMTP product!
export const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "ad36bc7eae7390",
      pass: "6c45a4d6a03aff"
    }
  });

