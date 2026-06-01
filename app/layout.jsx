import './globals.css'

export const metadata = {
  title: 'Controle Financeiro',
  description: 'Controle financeiro pessoal — entradas, despesas fixas e variáveis, metas e cartões.',
}

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('controle-financeiro-theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (!t && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Hanken+Grotesk:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
