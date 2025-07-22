
'use server';
/**
 * @fileOverview A flow for generating product images using AI.
 *
 * - generateImageForProduct - A function that generates an image based on a prompt.
 * - GenerateImageInput - The input type for the generateImageForP roduct function.
 * - GenerateImageOutput - The return type for the generateImageForProduct function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate the image from.'),
  productName: z.string().describe('The name of the product for context.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z
    .string()
    .describe(
      'The data URI of the generated image. Format: data:image/png;base64,<encoded_data>'
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImageForProduct(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `a professional, high-quality, delicious-looking product photograph of a product for "Adonay Express" called ${input.productName}, with the following characteristics: ${input.prompt}. The image should be on a clean, neutral background, looking like a commercial photo for the Adonay Express brand.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const imageUrl = media?.url;
    if (!imageUrl) {
      throw new Error('Image generation failed to return a valid URL.');
    }

    return { imageUrl };
  }
);
