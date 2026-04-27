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
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans bg-stone-50 dark:bg-stone-950 antialiased">
        {children}
      </body>
    </html>
  )
}
