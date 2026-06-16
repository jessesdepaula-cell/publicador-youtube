import "./globals.css";

export const metadata = {
  title: "Publicador YouTube",
  description: "Publica vídeos em 3 canais com IA para thumb, título, descrição e tags",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
