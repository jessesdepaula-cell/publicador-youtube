import OpenAI from "openai";

let _client: OpenAI | null = null;
function openai(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY nao configurada");
  _client = new OpenAI({ apiKey });
  return _client;
}

export interface GeneratedMetadata {
  title: string;
  description: string;
  tags: string[];
}

const NICHE_HINTS: Record<string, string> = {
  default: "conteudo geral, foco em engajamento e CTR alto",
};

export async function generateMetadata(args: {
  topic: string;
  niche?: string;
  channelName: string;
  transcript?: string;
}): Promise<GeneratedMetadata> {
  const hint = NICHE_HINTS[args.niche || "default"] || args.niche || NICHE_HINTS.default;
  const transcriptBlock = args.transcript
    ? `\nTranscricao do audio do video (use como fonte principal para titulo/descricao/tags):\n"""${args.transcript.slice(0, 8000)}"""\n`
    : "";

  const completion = await openai().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce e um especialista em YouTube SEO brasileiro. Cria metadados otimizados para CTR e algoritmo. Retorna JSON com {title, description, tags[]}.",
      },
      {
        role: "user",
        content: `Canal: ${args.channelName}
Nicho/estilo: ${hint}
Assunto do video: ${args.topic}
${transcriptBlock}
Gere:
- title: maximo 70 caracteres, com gancho emocional ou curiosidade. SEM clickbait barato. Em PT-BR.
- description: 3-5 paragrafos curtos. Primeira linha eh hook. Inclui 2-3 hashtags no final.
- tags: array com 15-20 tags relevantes, mix de short-tail e long-tail. Em PT-BR.

JSON apenas, sem texto fora do JSON.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return {
    title: String(parsed.title || "").slice(0, 100),
    description: String(parsed.description || "").slice(0, 5000),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 30) : [],
  };
}

export async function generateThumbnail(args: {
  topic: string;
  title: string;
  niche?: string;
}): Promise<Buffer> {
  const prompt = `YouTube thumbnail 1280x720, estilo cinematografico premium, alto contraste, foco no rosto/objeto principal, texto curto e legivel em portugues em destaque, paleta vibrante mas profissional. Tema: ${args.topic}. Headline visivel: "${args.title.slice(0, 40)}". SEM marcas, SEM logos do YouTube.`;

  const res = await openai().images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1536x1024",
    quality: "high",
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI nao retornou imagem");
  return Buffer.from(b64, "base64");
}
