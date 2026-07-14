import { IAIProvider } from '../../../core/providers/IAIProvider';

export class NvidiaAIProvider implements IAIProvider {
  async generateContent(prompt: string, image?: { data: string; mimeType: string }): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY não configurada.");
    }

    const payload: any = {
      model: "meta/llama-3.1-70b-instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
    };

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Nvidia API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let raw = data.choices[0]?.message?.content?.trim() || "";
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return raw;
  }
}
