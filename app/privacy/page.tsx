export const metadata = { title: "Política de Privacidade — Publicador YouTube" };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 prose prose-invert">
      <h1>Política de Privacidade</h1>
      <p>
        Esta aplicação é uma ferramenta pessoal de uso individual do proprietário para publicação
        de seus próprios vídeos nos canais do YouTube e TikTok que ele administra.
      </p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Tokens OAuth necessários para publicar nas plataformas (armazenados em variáveis de ambiente cifradas).</li>
        <li>Metadados gerados por IA (título, descrição, tags) usados unicamente para preencher campos da publicação.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>Nada é compartilhado com terceiros além das próprias APIs do YouTube, TikTok e OpenAI.</p>
      <h2>Contato</h2>
      <p>jessesdepaula@gmail.com</p>
    </main>
  );
}
