
'use server';

import { Resend } from 'resend';

// La clave API de Resend debe estar en el archivo .env como NEXT_PUBLIC_RESEND_API_KEY.
const resendApiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;


// Opcional: si se define esta variable en .env, todos los correos se redirigirán a esta dirección.
const recipientOverride = process.env.NEXT_PUBLIC_RESEND_RECIPIENT_OVERRIDE;


interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

// Update the return type to better reflect Resend's error object shape
type ResendError = {
  message: string;
  name: string;
  statusCode?: number;
};

export async function sendOrderUpdateEmail({ to, subject, html }: EmailPayload): Promise<{ data: { id: string } | null; error: ResendError | null }> {
  const finalRecipient = recipientOverride || to;
  
  if (!resend || !resendApiKey || resendApiKey === 'TU_RESEND_API_KEY_AQUI') {
    console.warn("Resend no está configurado. El correo no se enviará. Se mostrará en consola.");
    console.log("----- INICIO CORREO SIMULADO -----");
    console.log(`Para: ${finalRecipient} (Original: ${to})`);
    console.log(`Asunto: ${subject}`);
    console.log("Cuerpo:");
    console.log(html);
    console.log("----- FIN CORREO SIMULADO -----");
    // Simulate a successful response for flows that depend on it
    return { data: { id: `simulated_${new Date().getTime()}` }, error: null };
  }

  try {
    const response = await resend.emails.send({
      from: 'Adonay Express <onboarding@resend.dev>',
      to: [finalRecipient],
      subject: subject,
      html: html,
    });

    if (response.error) {
      console.error('Resend API Error:', response.error);
      return { data: null, error: response.error };
    }

    return { data: response.data, error: null };
  } catch (error: any) {
    console.error('Exception sending email:', error);
    const errorMessage = error.message || 'An unexpected exception occurred.';
    const errorName = error.name || 'UnknownException';
    return { data: null, error: { message: errorMessage, name: errorName } };
  }
}
