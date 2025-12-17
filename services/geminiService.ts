import { GoogleGenAI } from "@google/genai";
import { SENTRY_FRAMEWORK_TEXT } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getGeminiResponse = async (userMessage: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API_KEY is missing. Please provide a valid API key in the environment.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are SENTRY-AI, a specialized assistant for the SENTRY Security Framework.
      Your goal is to assist security architects and engineers in understanding and implementing the framework.
      
      Here is the official SENTRY Framework Documentation:
      ${SENTRY_FRAMEWORK_TEXT}

      Key Architecture Details for Automated Pipeline (Phase IV):
      1. Trigger: 'google.storage.object.finalize' on Cloud Storage bucket.
      2. Processing: Serverless Cloud Functions (2nd Gen) or Cloud Run Jobs for ETL (Entity Resolution, Parsing).
      3. Database: Writes to Cloud SQL or AlloyDB (PostgreSQL).
      4. Notification: Pub/Sub messages trigger cache invalidation in the Cloud Run frontend.
      5. Monitoring: Cloud Logging & Cloud Monitoring for audit trails.

      Rules:
      1. Only answer questions related to the SENTRY framework, GCP security, or the vendor data concepts described.
      2. Be concise, technical, and professional.
      3. If asked about implementation details (e.g., "How do I secure the database?"), refer specifically to the Phase III section about CMEK and Cloud KMS.
      4. Format your response with Markdown.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Low temperature for factual accuracy based on the doc
      }
    });

    return response.text || "I couldn't generate a response based on the provided context.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request. Please check your API key and try again.";
  }
};