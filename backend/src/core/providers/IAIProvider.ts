export interface IAIProvider {
  generateContent(prompt: string, image?: { data: string; mimeType: string }): Promise<string>;
}
