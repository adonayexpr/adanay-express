
'use server';
/**
 * @fileOverview A flow for generating and sending order status update emails.
 *
 * - generateOrderUpdateEmail - A function that generates and sends an email for an order update.
 * - GenerateOrderUpdateEmailInput - The input type for the function.
 * - GenerateOrderUpdateEmailOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendOrderUpdateEmail } from '@/lib/email';
import { Timestamp } from 'firebase/firestore';

const OrderItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const GenerateOrderUpdateEmailInputSchema = z.object({
  orderNumber: z.string().describe('The user-facing order identifier.'),
  newStatus: z.string().describe('The new status of the order.'),
  total: z.number().describe('The total price of the order.'),
  items: z.array(OrderItemSchema).describe('The list of items in the order.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  date: z.string().describe('The date of the order.')
});
export type GenerateOrderUpdateEmailInput = z.infer<typeof GenerateOrderUpdateEmailInputSchema>;

const GenerateOrderUpdateEmailOutputSchema = z.object({
  emailSent: z.boolean().describe('Whether the email was sent successfully.'),
  messageId: z.string().optional().describe('The message ID from the email provider.'),
  error: z.string().optional().describe('Any error message if the email failed to send.'),
});
export type GenerateOrderUpdateEmailOutput = z.infer<typeof GenerateOrderUpdateEmailOutputSchema>;


export async function generateOrderUpdateEmail(
  input: GenerateOrderUpdateEmailInput
): Promise<GenerateOrderUpdateEmailOutput> {
  return generateAndSendEmailFlow(input);
}

// Prompts for each status
const emailRecibidoPrompt = ai.definePrompt({
    name: 'emailRecibidoPrompt',
    input: { schema: GenerateOrderUpdateEmailInputSchema },
    output: { schema: z.object({ subject: z.string(), body: z.string() }) },
    prompt: `
        You are an email generation assistant for "Adonay Express", a delivery service.
        Generate an email in Spanish for the "Recibido" status.
        Subject: Hemos recibido tu pedido de Adonay Express: #{{{orderNumber}}}
        Body:
        <p>¡Hola!</p>
        <p>Te confirmamos que hemos recibido tu pedido <strong>#{{{orderNumber}}}</strong> realizado el <strong>{{{date}}}</strong>.</p>
        <p>Nuestro equipo lo revisará pronto y te notificaremos cuando sea aceptado.</p>
        <p>¡Gracias por preferir Adonay Express!</p>
        <p><em>El equipo de Adonay Express</em></p>
    `
});

const emailAceptadoPrompt = ai.definePrompt({
    name: 'emailAceptadoPrompt',
    input: { schema: GenerateOrderUpdateEmailInputSchema.extend({
        itemsWithSubtotal: z.array(OrderItemSchema.extend({
            subtotal: z.number()
        }))
    }) },
    output: { schema: z.object({ subject: z.string(), body: z.string() }) },
    prompt: `
        You are an email generation assistant for "Adonay Express", a delivery service.
        Generate an email for the "Aceptado" status, formatted as a receipt or ticket. Use an HTML table for the items.
        Subject: ¡Tu pedido #{{{orderNumber}}} ha sido aceptado!
        Body:
        <div style="font-family: Arial, sans-serif; color: #333;">
            <p>¡Excelentes noticias!</p>
            <p>Tu pedido <strong>#{{{orderNumber}}}</strong> ha sido aceptado y ya estamos preparando tus productos.</p>
            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3 style="text-align: center; margin-top: 0;">Resumen de Compra</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background-color: #f2f2f2;">
                        <tr>
                            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">Producto</th>
                            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">Cantidad</th>
                            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Precio Unit.</th>
                            <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each itemsWithSubtotal}}
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{this.name}}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">{{this.quantity}}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">\${{this.price}}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">\${{this.subtotal}}</td>
                        </tr>
                        {{/each}}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold;">Total del Pedido:</td>
                            <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 1.1em;">\${{total}}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p style="margin-top: 25px;">Te avisaremos cuando tu pedido salga a reparto.</p>
            <p>Gracias por tu compra.</p>
            <p><em>El equipo de Adonay Express</em></p>
        </div>
    `
});


const emailEnRepartoPrompt = ai.definePrompt({
    name: 'emailEnRepartoPrompt',
    input: { schema: GenerateOrderUpdateEmailInputSchema },
    output: { schema: z.object({ subject: z.string(), body: z.string() }) },
    prompt: `
        You are an email generation assistant for "Adonay Express", a delivery service.
        Generate an email for the "En Reparto" status.
        Subject: ¡Tu pedido de Adonay Express va en camino! 🚚
        Body:
        <p>¡Hola!</p>
        <p>¡La espera casi termina! Tu pedido <strong>#{{{orderNumber}}}</strong> del <strong>{{{date}}}</strong> ha salido de nuestra tienda y ahora está <strong>en reparto</strong>.</p>
        <p>Prepárate para disfrutar de tu pedido muy pronto.</p>
        <p>¡Que lo disfrutes!</p>
        <p><em>El equipo de Adonay Express</em></p>
    `
});

const emailCompletadoPrompt = ai.definePrompt({
    name: 'emailCompletadoPrompt',
    input: { schema: GenerateOrderUpdateEmailInputSchema },
    output: { schema: z.object({ subject: z.string(), body: z.string() }) },
    prompt: `
        You are an email generation assistant for "Adonay Express", a delivery service.
        Generate an email for the "Completado" status.
        Subject: ¡Tu pedido #{{{orderNumber}}} ha sido entregado!
        Body:
        <p>¡Hola!</p>
        <p>Confirmamos que tu pedido <strong>#{{{orderNumber}}}</strong> ha sido entregado exitosamente.</p>
        <p>Esperamos que disfrutes de tu compra. ¡Vuelve pronto!</p>
        <p><strong>¿Te gustó nuestro servicio?</strong> ¡Déjanos una reseña!</p>
        <p><em>El equipo de Adonay Express</em></p>
    `
});

const emailPendientePrompt = ai.definePrompt({
    name: 'emailPendientePrompt',
    input: { schema: GenerateOrderUpdateEmailInputSchema },
    output: { schema: z.object({ subject: z.string(), body: z.string() }) },
    prompt: `
        You are an email generation assistant for "Adonay Express", a delivery service.
        Generate a generic update email for "Pendiente" status. This should not happen often, but be prepared.
        Subject: Actualización de tu pedido de Adonay Express: #{{{orderNumber}}}
        Body:
        <p>¡Hola!</p>
        <p>Te informamos que el estado de tu pedido <strong>#{{{orderNumber}}}</strong> ha sido actualizado a: <strong>{{newStatus}}</strong>.</p>
        <p>Gracias por tu paciencia.</p>
        <p><em>El equipo de Adonay Express</em></p>
    `
});


const generateAndSendEmailFlow = ai.defineFlow(
    {
        name: 'generateAndSendEmailFlow',
        inputSchema: GenerateOrderUpdateEmailInputSchema,
        outputSchema: GenerateOrderUpdateEmailOutputSchema,
    },
    async (input) => {
        let emailContentPromise;

        // 1. Choose the right prompt based on the status
        switch (input.newStatus) {
            case 'Recibido':
                emailContentPromise = emailRecibidoPrompt(input);
                break;
            case 'Aceptado':
                // Pre-calculate subtotals and pass them to the prompt
                const itemsWithSubtotal = input.items.map(item => ({
                    ...item,
                    subtotal: item.price * item.quantity,
                }));
                emailContentPromise = emailAceptadoPrompt({ ...input, itemsWithSubtotal });
                break;
            case 'En Reparto':
                emailContentPromise = emailEnRepartoPrompt(input);
                break;
            case 'Completado':
                emailContentPromise = emailCompletadoPrompt(input);
                break;
            case 'Pendiente':
            default:
                emailContentPromise = emailPendientePrompt(input);
                break;
        }

        const { output: emailContent } = await emailContentPromise;

        if (!emailContent || !emailContent.body) {
            return { emailSent: false, error: "Failed to generate email content for the specified status." };
        }

        // 2. Send the generated email
        const { data, error } = await sendOrderUpdateEmail({
            to: input.customerEmail,
            subject: emailContent.subject,
            html: emailContent.body,
        });

        if (error) {
            const errorMessage = `Resend Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
            return { emailSent: false, error: errorMessage };
        }
        
        if (!data) {
             return { emailSent: false, error: "Resend did not return data or an error." };
        }
        
        // 3. Return the result
        return {
            emailSent: true,
            messageId: data.id,
        };
    }
);
