import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Syne } from "next/font/google";
import { Preferencias } from "@/components/preferencias";
import { Splash } from "@/components/splash";
import "./globals.css";
import { aplicarCorPersonalizada, CHAVE_COR, ID_PERSONALIZADA } from "@/lib/cor-personalizada";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
// Letra de mão do bilhete da Frase do dia.
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["700"] });

export const metadata: Metadata = {
  title: "Escola Impulse",
  description: "App de gestão da Escola Impulse",
  icons: { icon: "/icon-512.png", apple: "/icon-512.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Escola Impulse" },
};

export const viewport: Viewport = {
  themeColor: "#1a52d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Aplica tema, cor de destaque e tamanho de fonte salvos ANTES da primeira
// pintura — sem isso a tela pisca no tema padrão até o React carregar.
const scriptPreferencias = `try{var d=document.documentElement;d.setAttribute('data-theme',localStorage.getItem('tema')||'dark');var a=localStorage.getItem('impulse_accent');if(a)d.setAttribute('data-accent',a);if(a==='${ID_PERSONALIZADA}')(${aplicarCorPersonalizada.toString()})(localStorage.getItem('${CHAVE_COR}'));var f=localStorage.getItem('impulse_fontsize');if(f)d.style.zoom=parseInt(f)/100}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" translate="no" className={`${inter.variable} ${syne.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptPreferencias }} />
      </head>
      <body>
        <Preferencias>
          <Splash />
          {children}
        </Preferencias>
      </body>
    </html>
  );
}
