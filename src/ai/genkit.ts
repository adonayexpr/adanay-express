
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Next.js automatically loads environment variables from .env
// so we don't need 'dotenv'.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // This warning will appear in the server terminal if the key is not configured
  console.warn("GEMINI_API_KEY is not configured in .env. AI functions will not work.");
}

// Make sure the GEMINI_API_KEY variable is defined in your .env file
export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  // The default model can be configured here.
  // Individual flows can specify different models.
  model: 'googleai/gemini-2.0-flash',
});
