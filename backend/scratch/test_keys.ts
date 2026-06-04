import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testKeys() {
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(",").map(k => k.replace(/['"]/g, "").trim()).filter(k => k.length > 0);
  
  console.log(`Found ${keys.length} keys to test.`);
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`\nTesting Key ${i}: ${key.substring(0, 10)}...`);
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent("Respond with: OK");
      console.log(`Key ${i} Success! Response: ${result.response.text().trim()}`);
    } catch (e: any) {
      console.error(`Key ${i} Failed:`, e.message);
    }
  }
}

testKeys();
