import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiRotator } from './src/infra/providers/gemini/GeminiRotator';

async function test() {
  try {
    const rotator = new GeminiRotator();
    const activeKey = rotator.getActiveKey();
    console.log("Using key starting with:", activeKey.substring(0, 10));
    
    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log("Calling Gemini...");
    const result = await model.generateContent("Respond with JSON: {\"status\": \"success\"}");
    console.log("Result:", result.response.text());
  } catch (err: any) {
    console.error("Gemini Error:", err.message);
    if (err.status) console.error("Status:", err.status);
  }
}
test();
