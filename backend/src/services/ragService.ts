import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    // Suppress console error to avoid spamming user's terminal
    // Ponytail fallback: se a API falhar (limite ou falta de rede), retorna vetor vazio.
    return new Array(768).fill(0); // embedding-001 has 768 dimensions
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function splitTextIntoChunks(text: string, chunkSize: number = 400, overlap: number = 80): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function addDocumentToRag(filename: string, content: string, instituicao: string): Promise<any> {
  const doc = await prisma.document.create({
    data: {
      filename,
      instituicao
    }
  });

  const rawChunks = splitTextIntoChunks(content);
  for (const chunkText of rawChunks) {
    const embedding = await generateEmbedding(chunkText);
    await prisma.documentChunk.create({
      data: {
        documentId: doc.id,
        content: chunkText,
        embedding
      }
    });
  }
  return doc;
}

export async function retrieveRelevantChunks(queryText: string, instituicao: string, limit: number = 3): Promise<any[]> {
  const queryEmbedding = await generateEmbedding(queryText);
  
  // Ponytail: scan O(N) simple retrieval for local institution chunks
  const chunks = await prisma.documentChunk.findMany({
    where: { document: { instituicao } },
    include: { document: true }
  });

  const scored = chunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    filename: chunk.document.filename,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.filter(s => s.similarity > 0.35).slice(0, limit);
}
