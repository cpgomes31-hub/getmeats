import emailjs from '@emailjs/browser';

// Configurar EmailJS
const SERVICE_ID = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY || '';

export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  payment_link?: string;
  qr_code?: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  try {
    const templateParams = {
      to_email: data.to_email,
      to_name: data.to_name,
      subject: data.subject,
      message: data.message,
      payment_link: data.payment_link || '',
      qr_code: data.qr_code || '',
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('Email enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
}