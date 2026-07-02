import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Presentation, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Smartphone, 
  Database, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Layers, 
  Coins, 
  AlertCircle,
  FileText,
  Workflow
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Slide {
  id: number;
  title: string;
  category: string;
  description: string;
  bullets: string[];
  meta: string;
  color: string;
  icon: React.ReactNode;
}

export function PitchDeck({ onBack }: { onBack?: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const slides: Slide[] = [
    {
      id: 1,
      category: "APRESENTAÇÃO EXECUTIVA",
      title: "MS BARBER SHOP",
      description: "A próxima geração de experiência digital para barbearias premium. Um ecossistema completo focado em retenção de clientes, otimização de faturamento e agendamento contínuo.",
      bullets: [
        "Plataforma completa de relacionamento e gestão com faturamento em tempo real.",
        "Tecnologia web de alta performance substitui aplicativos pesados da App Store.",
        "Disponível instantaneamente via link ou QR Code com suporte a instalação PWA.",
        "Foco estético em luxo e design esportivo (Copa do Mundo / Visual Premium)."
      ],
      meta: "A revolução na experiência de barbearias",
      color: "from-amber-500/20 to-red-500/20",
      icon: <Layers className="w-8 h-8 text-amber-500" />
    },
    {
      id: 2,
      category: "DIFERENCIAL DE ENGENHARIA",
      title: "TECNOLOGIA PWA & OFFLINE-FIRST",
      description: "Por que PWAs (Progressive Web Apps) superam os aplicativos de loja nativos hoje em dia?",
      bullets: [
        "Instalação Instantânea: Sem passar por Apple Store ou Google Play, o cliente adiciona o app em 2 cliques.",
        "Peso Ultraleve: Consome menos de 5MB de dados comparado a dezenas de megabytes nas lojas convencionais.",
        "Resiliência Offline: Funciona em conexões instáveis ou ausência de sinal graças a Service Workers dedicados.",
        "Indicador Ativo de Conexão: Alerta de rede nativo com re-sincronização automática em segundo plano."
      ],
      meta: "Infraestrutura moderna e acessível no iOS e Android",
      color: "from-blue-500/20 to-purple-500/20",
      icon: <Smartphone className="w-8 h-8 text-blue-400" />
    },
    {
      id: 3,
      category: "ARQUITETURA DE SISTEMAS",
      title: "ARQUITETURA & SEGURANÇA",
      description: "Engenharia moderna de software com as tecnologias mais velozes e confiáveis do mercado corporativo global.",
      bullets: [
        "Frontend Reativo: React 19 + TypeScript + Vite compilado, rodando de forma fluida a 60 FPS sustentados.",
        "Banco de Dados Real-time: Firebase Cloud Firestore para sincronização ao vivo sem necessidade de recarregar a tela.",
        "Backend Seguro: Servidor Express em TypeScript com isolamento de tokens de notificações.",
        "Segurança Avançada: Políticas restritivas configuradas via Firestore Security Rules para privacidade perfeita."
      ],
      meta: "Arquitetura robusta livre de falhas de escalabilidade",
      color: "from-purple-500/20 to-emerald-500/20",
      icon: <Database className="w-8 h-8 text-purple-400" />
    },
    {
      id: 4,
      category: "NOTIFICAÇÕES EM SEGUNDO PLANO",
      title: "ENGENHARIA DE COMUNICAÇÃO (PUSH)",
      description: "Alertas imediatos mesmo com o aplicativo fechado ou telefone bloqueado.",
      bullets: [
        "Integração Híbrida: Utiliza Firebase Cloud Messaging (FCM) e Service Workers ativos (sw-push.js).",
        "Alta Confiabilidade Push: Payload estruturado exibe banners, fotos personalizadas, links e vibrações.",
        "Destaque iOS Standalone: Notificações push nativas homologadas para Safari Mobile no iOS 16.4+.",
        "Coleta de Tokens Silenciosa: Associação com os IDs de usuário cadastrados no banco para disparos pontuais."
      ],
      meta: "Redução de até 85% de faltas na barbearia",
      color: "from-amber-600/20 to-pink-500/20",
      icon: <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
    },
    {
      id: 5,
      category: "FUNCIONALIDADES DO CLIENTE E GESTÃO",
      title: "RECURSOS DE COMPETITIVIDADE",
      description: "Tudo o que a barbearia do cliente precisa para faturar mais e se organizar perfeitamente.",
      bullets: [
        "Agendamento Inteligente: Agendamento guiado, livre de sobreposições de horários de colaboradores.",
        "Financeiro e Gráficos: Visualização interativa de faturamento diário, semanal e mensal com Recharts.",
        "Controle de Colaboradores: Permissões distintas em nível de barbeiro, bloqueio de datas e controle de horários.",
        "Instagram Portfolio integrado: Mostruário com galeria Lookbook real-time via Firestore para inspiração."
      ],
      meta: "Controle absoluto em uma tela unificada",
      color: "from-emerald-500/20 to-amber-500/20",
      icon: <Calendar className="w-8 h-8 text-emerald-400" />
    },
    {
      id: 6,
      category: "MONETIZAÇÃO & MODELO SAAS",
      title: "ESTRUTURA FINANCEIRA E PREÇO",
      description: "Como monetizar essa solução para vários clientes ou cobrar do seu cliente proprietário?",
      bullets: [
        "Cobrança SaaS Sugerida: Mensalidade recorrente entre R$ 150,00 e R$ 350,00 por barbearia.",
        "Opção de Implantação Única: Taxa de setup de R$ 1.500,00 a R$ 3.000,00 (entrega chave na mão).",
        "Retorno Rápido: Com apenas 1 cliente recorrente recupera-se o custo de hospedagem e banco de dados que têm faixa gratuita generosa.",
        "Customização Multitenant: Prontidão técnica para espelhar o app para outras marcas criando uma rede."
      ],
      meta: "Faturamento recorrente e altamente escalável",
      color: "from-sky-500/20 to-indigo-500/20",
      icon: <Coins className="w-8 h-8 text-sky-400" />
    },
    {
      id: 7,
      category: "ETAPAS DE IMPLANTAÇÃO",
      title: "CRONOGRAMA DE ATIVAÇÃO",
      description: "Pronto para deploy em produção em menos de uma semana.",
      bullets: [
        "Dia 1-2: Setup do Firebase, Carregamento do catálogo de serviços e equipe.",
        "Dia 3: Configuração do domínio customizado do cliente com SSL gratuito.",
        "Dia 4: Homologação no dispositivo do cliente e salvamento do ícone na Home.",
        "Dia 5: Lançamento oficial para a base de clientes através de cartaz com QR Code."
      ],
      meta: "Ativação expressa orientada a resultados rápidos",
      color: "from-neutral-800/50 to-neutral-500/10",
      icon: <Workflow className="w-8 h-8 text-white" />
    }
  ];

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // ----------------------------------------------------
  // Dynamic high-quality PDF builder using jsPDF
  // ----------------------------------------------------
  const generatePresentationPdf = async () => {
    setGeneratingPdf(true);
    toast.loading("Gerando PDF de alta qualidade...", { id: "pdf-gen" });

    try {
      // 1. Initialize jsPDF (Standard Horizontal Presentation Slide A4 format)
      // A4 horizontal: 297mm width by 210mm height
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const width = doc.internal.pageSize.getWidth(); // 297
      const height = doc.internal.pageSize.getHeight(); // 210

      // Color Palette Configurations
      const cPrimary = [245, 158, 11];  // Amber #f59e0b
      const cDarkBg = [23, 23, 23];      // Charcoal body dark bg
      const cLightBg = [248, 250, 252];  // Soft gray/white paper background for ink saving
      const cDarkText = [17, 24, 39];   // Dark text
      const cMutedText = [100, 116, 139]; // Slate gray text

      const drawHeader = (pageNum: number, titleStr: string) => {
        // Draw header strip
        doc.setFillColor(23, 23, 23); // dark bar
        doc.rect(0, 0, width, 18, "F");

        // Header Title
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("MS BARBER SHOP  |  PROPOSTA COMERCIAL & PILHA DE ENGENHARIA", 15, 11);

        // Slide Indicator
        doc.setFillColor(245, 158, 11);
        doc.rect(width - 45, 0, 45, 18, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`SLIDE ${pageNum} / 7`, width - 32, 11);
      };

      const drawFooter = (captionStr: string) => {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(15, height - 15, width - 15, height - 15);

        doc.setTextColor(115, 115, 115);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(captionStr, 15, height - 10);
        doc.text("Contato & Suporte Técnico: offmeinc@gmail.com", width - 85, height - 10);
      };

      // ----------------------------------------------------
      // PAGE 1: COVER (Dark Luxury Theme)
      // ----------------------------------------------------
      doc.setFillColor(23, 23, 23); // charcoal dark theme cover
      doc.rect(0, 0, width, height, "F");
      
      // Top Decorative line
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, width, 6, "F");

      // Grid/Pattern Simulation
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.1);
      for (let i = 0; i < width; i += 30) {
        doc.line(i, 0, i, height);
      }
      for (let j = 0; j < height; j += 30) {
        doc.line(0, j, width, j);
      }

      // Cover Texts
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("APRESENTAÇÃO EXECUTIVA PREMIUM", 30, 65);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(44);
      doc.text("MS BARBER SHOP", 30, 85);

      doc.setTextColor(163, 163, 163);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text("A Plataforma SaaS de Agendamento, Gestão de Lucros, e Retenção Offline-First.", 30, 98);

      // Tech labels
      doc.setFillColor(34, 197, 94, 0.2); // Green alpha-like
      doc.rect(30, 115, 60, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PWA STANDALONE HABILITADO", 35, 120.5);

      doc.setFillColor(59, 130, 246, 0.2); // Blue alpha-like
      doc.rect(95, 115, 60, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("REAL-TIME FIREBASE STORAGE", 100, 120.5);

      doc.setFillColor(239, 68, 68, 0.2); // Red
      doc.rect(160, 115, 55, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PUSH NOTIFICATIONS ATIVO", 165, 120.5);

      // Bottom info
      doc.setTextColor(115, 115, 115);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Preparado para: Apresentação Comercial para Clientes Premium", 30, 160);
      doc.text("Data de Geração do Relatório: Outubro de 2026", 30, 166);
      doc.text("Propriedade de Engenharia e Código de Canal Fechado", 30, 172);

      // Gold badge footer decoration
      doc.setFillColor(245, 158, 11);
      doc.rect(width - 55, height - 30, 55, 30, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("SOCIALLY", width - 42, height - 16);
      doc.setFontSize(7);
      doc.text("60 FPS ENGINE", width - 44, height - 10);

      // ----------------------------------------------------
      // PAGE 2: VALOR PWA
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252); // light background to save ink
      doc.rect(0, 0, width, height, "F");

      drawHeader(2, "ENGENHARIA PWA");
      
      // Page Main Title
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Por que a Tecnologia PWA supera Aplicativos Nativos da Loja?", 20, 38);

      // Context Description
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("Os Progressive Web Apps combinam a facilidade de acesso de um site com a robustez e interfaces de aplicativos instalados.", 20, 46);

      // 4 Grid Columns
      const pwaItems = [
        { title: "Instalação Descomplicada", text: "Sem a burocracia de download na Apple Store ou Google Play Store. O usuário acessa a URL e adiciona o ícone de atalho diretamente à tela de início em apenas dois toques.", badge: "Fácil Acesso" },
        { title: "Desempenho Veloz", text: "Graças ao carregamento estático e compilação otimizada com Vite & TypeScript, o aplicativo abre instantaneamente no navegador padrão do dispositivo.", badge: "60 FPS" },
        { title: "Notificações Reais", text: "Service Worker secundário intercepta eventos de rede para disparar notificações push integradas mesmo se o celular estiver bloqueado.", badge: "Engajamento" },
        { title: "Offline-First", text: "Capacidade de reter dados locais caso o cliente perca a conexão. O aplicativo exibe uma barra de conectividade e sincroniza dados em background.", badge: "Resiliência" },
      ];

      pwaItems.forEach((item, idx) => {
        const xPos = 20 + (idx * 63);
        const yPos = 62;
        
        // draw background card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.5);
        doc.roundedRect(xPos, yPos, 58, 92, 4, 4, "FD");

        // Header line
        doc.setFillColor(245, 158, 11);
        doc.rect(xPos, yPos, 58, 3, "F");

        // Badge
        doc.setFillColor(239, 246, 255);
        doc.rect(xPos + 5, yPos + 8, 30, 5, "F");
        doc.setTextColor(37, 99, 235);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(item.badge.toUpperCase(), xPos + 7, yPos + 11.5);

        // Title
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(item.title, xPos + 5, yPos + 22);

        // Description text wrap
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splitText = doc.splitTextToSize(item.text, 48);
        doc.text(splitText, xPos + 5, yPos + 29);
      });

      drawFooter("MS Barber Shop - Superioridade de Engenharia frente ao modelo tradicional de Apps");

      // ----------------------------------------------------
      // PAGE 3: STACK TECNOLÓGICA
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, "F");

      drawHeader(3, "ARQUITETURA DE SISTEMAS");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Pilha Tecnológica e Engenharia de Sincronização", 20, 38);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("A combinação de ferramentas modernas garante que o gerenciador de barbearia suporte alta demanda em tempo real.", 20, 46);

      // Left Column (Tech diagram description)
      const graphX = 20;
      const graphY = 60;
      doc.setFillColor(23, 23, 23);
      doc.roundedRect(graphX, graphY, 115, 94, 4, 4, "F");

      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("CONEXÃO DE DADOS COMPORTAMENTAL (FLUXO LIVE)", graphX + 8, graphY + 12);

      // Draw blocks layout for live syncing
      const drawBlock = (x: number, y: number, w: number, h: number, text: string, color: number[]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, w, h, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(text, x + (w / 2) - (doc.getTextWidth(text) / 2), y + (h / 2) + 2.5);
      };

      drawBlock(graphX + 10, graphY + 25, 40, 12, "Cliente (PWA / iOS)", [30, 41, 59]);
      drawBlock(graphX + 10, graphY + 50, 40, 12, "Admin (Barbeiro dashboard)", [30, 41, 59]);
      
      // Arrow lines
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(1);
      doc.line(graphX + 50, graphY + 31, graphX + 70, graphY + 43);
      doc.line(graphX + 50, graphY + 56, graphX + 70, graphY + 43);

      drawBlock(graphX + 70, graphY + 37, 35, 14, "Firebase Live-Sync", [217, 119, 6]);

      doc.setTextColor(163, 163, 163);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Sincronismo via WebSockets nativo elimina a necessidade", graphX + 10, graphY + 74);
      doc.text("de recarregar a tela para ver atualizações de faturamento.", graphX + 10, graphY + 79);
      doc.text("Segurança blindada por regras lógicas no Firestore.", graphX + 10, graphY + 84);

      // Right Column (Details list)
      const detailX = 145;
      const detailY = 60;
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Componentes da堆 (Stack):", detailX, detailY);

      const stackItems = [
        { label: "Frontend", val: "React 19, TypeScript, Tailwind CSS, Motion" },
        { label: "Servidor & Transpilação", val: "Express (Node.js), esbuild, tsx runtime" },
        { label: "Notificação Nativa", val: "FCM, Service Workers, Web Push API" },
        { label: "Armazenamento", val: "Cloud Firestore Real-Time Database" },
        { label: "Segurança", val: "Regras restritivas Firestore & Auth" },
      ];

      stackItems.forEach((item, idx) => {
        const itemY = detailY + 12 + (idx * 16);
        doc.setFillColor(245, 158, 11);
        doc.circle(detailX + 2, itemY - 2, 1.5, "F");
        
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(item.label, detailX + 8, itemY - 1);

        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(item.val, detailX + 8, itemY + 4);
      });

      drawFooter("MS Barber Shop - Infraestrutura segura de nível corporativo e escalável");

      // ----------------------------------------------------
      // PAGE 4: NOTIFICAÇÕES PUSH
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, "F");

      drawHeader(4, "NOTIFICAÇÕES PUSH");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Engenharia de Notificações com o App Fechado", 20, 38);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("O profissional e o cliente precisam receber atualizações de horários instantaneamente. Veja como solucionamos isso:", 20, 46);

      // Large visual feature table/card list
      const pushBlocks = [
        { label: "FCM e Service Worker Ativo", text: "Configuramos 'firebase-messaging-sw.js' para ouvir chamadas de rede do Google FCM mesmo que o celular do prestador de serviço esteja em repouso nos servidores locais." },
        { label: "Suporte iOS Standalone", text: "iOS suporta notificações no Safari apenas se o app for favoritado na tela de início. Nosso sistema detecta e exibe uma janela informativa explicando como favoritar (PushPrompt)." },
        { label: "Associação de ID no Banco", text: "Guardamos o token de inscrição seguro do navegador acoplado ao Id do Firebase Auth do barbeiro para disparar alertas personalizados e exclusivos sem spam." },
        { label: "Alta Performance & Retenção", text: "Lembretes automatizados evitam ausência esquecidas e cancelamentos de última hora, impulsionando a lucratividade média mensal da barbearia em até 30%." }
      ];

      pushBlocks.forEach((block, idx) => {
        const blX = 20 + (idx % 2) * 130;
        const blY = 56 + Math.floor(idx / 2) * 48;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(blX, blY, 122, 42, 3, 3, "FD");

        // Icon dot
        doc.setFillColor(245, 158, 11);
        doc.circle(blX + 10, blY + 12, 2.5, "F");

        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(block.label, blX + 18, blY + 14);

        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const splitted = doc.splitTextToSize(block.text, 105);
        doc.text(splitted, blX + 10, blY + 22);
      });

      drawFooter("MS Barber Shop - Reduzindo custos por falta de clientes com lembretes na tela");

      // ----------------------------------------------------
      // PAGE 5: RECURSOS ADMINISTRATIVOS
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, "F");

      drawHeader(5, "NÚCLEO DE FUNCIONALIDADES");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Funcionalidades Incorporadas na Solução", 20, 38);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("Uma suíte robusta criada exclusivamente para otimizar a agenda física e a gestão financeira de equipes inteiras.", 20, 46);

      // Split in 2 big lists: Client experience & Management Experience
      const boxW = 120;
      const boxH = 96;

      // Col 1
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 58, boxW, boxH, 4, 4, "FD");
      
      doc.setFillColor(245, 158, 11);
      doc.rect(20, 58, boxW, 4, "F");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EXPERIÊNCIA AUTOMATIZADA DO CLIENTE", 28, 70);

      const clientFeatures = [
        "Catálogo de cortes interativo e seleção de barbeiro.",
        "Tela de agendamento por passos (serviço -> horário).",
        "Visualização de histórico de cortes passados.",
        "Lookbook estilizado para escolha de modelos offline.",
        "Perfil com progresso de milhagem/fidelidade.",
      ];

      clientFeatures.forEach((feat, i) => {
        const fY = 82 + (i * 12);
        doc.setFillColor(245, 158, 11);
        doc.rect(28, fY - 2.5, 3, 3, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "medium");
        doc.setFontSize(9);
        doc.text(feat, 35, fY);
      });

      // Col 2
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(155, 58, boxW, boxH, 4, 4, "FD");

      doc.setFillColor(17, 24, 39);
      doc.rect(155, 58, boxW, 4, "F");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PAINEL ADMIN DE CONTROLE DO DONO", 163, 70);

      const adminFeatures = [
        "Previsão e gráfico de faturamento por período.",
        "Gerenciamento de escala de colaboradores (bloqueio).",
        "Logs de depuração e auditorias para o desenvolvedor.",
        "Configurações globais de serviços do estabelecimento.",
        "Disparo de notificações de campanhas e promoções.",
      ];

      adminFeatures.forEach((feat, i) => {
        const fY = 82 + (i * 12);
        doc.setFillColor(17, 24, 39);
        doc.rect(163, fY - 2.5, 3, 3, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "medium");
        doc.setFontSize(9);
        doc.text(feat, 170, fY);
      });

      drawFooter("MS Barber Shop - Funcionalidades premium criadas sob medida para faturar mais");

      // ----------------------------------------------------
      // PAGE 6: MONETIZAÇÃO SAAS
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, "F");

      drawHeader(6, "MODELO COMERCIAL");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Preço Sugerido & Rentabilidade Recorrente (SaaS)", 20, 38);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("Dicas financeiras para você converter o app criado em lucro, seja vendendo para um barbeiro ou lançando como no modelo SaaS.", 20, 46);

      // Pricing Models
      const models = [
        { title: "Plano Recorrente Mensal (SaaS)", price: "R$ 149,00 a R$ 299,00", text: "Ideal para vender controle por escala. Você cobra por barbearia cadastrada. Dá direito às atualizações automatizadas de segurança e suporte das notificações push.", icon: "Recorrência" },
        { title: "Entrega Chave na Mão (Setup)", price: "R$ 1.500,00 a R$ 3.500,00", text: "Uma taxa de setup única cobrada para configurar o domínio personalizado do seu cliente primário, as fotografias no lookbook e treinar a equipe dele.", icon: "Hospedagem inclusa" },
        { title: "Hospedagem & Custos baixos", price: "Custo Técnico: Quase R$ 0,00", text: "Graças ao Cloud Firestore e hospedagem na nuvem de nível econômico, os custos operacionais iniciais são praticamente inexistentes na escala de teste.", icon: "Super Margem de Lucro" }
      ];

      models.forEach((item, idx) => {
        const xP = 20 + (idx * 85);
        const yP = 62;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xP, yP, 80, 92, 4, 4, "FD");

        doc.setFillColor(245, 158, 11);
        doc.circle(xP + 10, yP + 12, 1.5, "F");

        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(item.title, xP + 15, yP + 14);

        doc.setTextColor(245, 158, 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(item.price, xP + 10, yP + 30);

        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const blockSplit = doc.splitTextToSize(item.text, 62);
        doc.text(blockSplit, xP + 10, yP + 42);

        doc.setFillColor(240, 253, 244);
        doc.roundedRect(xP + 8, yP + 78, 64, 8, 2, 2, "F");
        doc.setTextColor(21, 128, 61);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(item.icon, xP + 12, yP + 83);
      });

      drawFooter("MS Barber Shop - Um negócio digital pronto para escalar sem infraestrutura pesada");

      // ----------------------------------------------------
      // PAGE 7: ROADMAP
      // ----------------------------------------------------
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, "F");

      drawHeader(7, "ETAPAS DE IMPLANTAÇÃO");

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Cronograma de Entrega e Suporte de Lançamento", 20, 38);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("As etapas de entrega para que seu cliente comece a usar a barbearia sem complicação técnica.", 20, 46);

      // Horizontal Timeline Blocks
      const steps = [
        { step: "Passo 1", title: "Configurações Globais", text: "Registrar domínio customizado, trocar logomarcas e incluir barbeiros iniciais no sistema.", duration: "Dia 1-2" },
        { step: "Passo 2", title: "Setup Notificações Push", text: "Instalação do Service Worker nativo no celular dos barbeiros para teste prático em segundo plano.", duration: "Dia 3" },
        { step: "Passo 3", title: "Treinamento & Lançamento", text: "Exposição do QRCode do app impresso no balcão da barbearia para o cliente favoritar na Home.", duration: "Dia 4-5" },
        { step: "Passo 4", title: "Acompanhamento do Lucro", text: "Visualização semanal da aba de Earnings / Faturamento no painel do administrador.", duration: "Semanal" }
      ];

      steps.forEach((step, idx) => {
        const stepX = 20 + (idx * 64);
        const stepY = 62;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(stepX, stepY, 58, 92, 4, 4, "FD");

        // Top number
        doc.setFillColor(17, 24, 39);
        doc.roundedRect(stepX, stepY, 25, 7, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(step.step, stepX + 5, stepY + 5);

        // Title
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const splTitle = doc.splitTextToSize(step.title, 50);
        doc.text(splTitle, stepX + 6, stepY + 18);

        // Text
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splText = doc.splitTextToSize(step.text, 46);
        doc.text(splText, stepX + 6, stepY + 36);

        // Duration text
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(stepX + 6, stepY + 76, 46, 8, 2, 2, "F");
        doc.setTextColor(180, 83, 9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(step.duration, stepX + 10, stepY + 81.5);

        // Arrow lines to connect (except last one)
        if (idx < 3) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(1);
          doc.line(stepX + 58, stepY + 45, stepX + 64, stepY + 45);
        }
      });

      drawFooter("MS Barber Shop - Automação inteligente e simplicidade que trazem resultados rápidos");

      // Save PDF to local device
      doc.save("Apresentacao_MS_Barber_Shop.pdf");
      toast.success("PDF da Apresentação baixado com sucesso!", { id: "pdf-gen" });
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro ao gerar o PDF.", { id: "pdf-gen" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Decorative Lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Container */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded">
              PITCH PREMIUM & TECNOLOGIA
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-wider text-white">
            MS BARBER SHOP <span className="text-amber-500 font-bold">SAAS DECK</span>
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            Use estes slides para apresentar a proposta ao seu cliente ou baixe a Proposta em PDF para envio formal.
          </p>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="px-5 py-3 hover:bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Voltar ao App
            </button>
          )}
          <button 
            onClick={generatePresentationPdf}
            disabled={generatingPdf}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-black rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)]"
          >
            <Download className="w-4 h-4" /> 
            {generatingPdf ? "GERANDO..." : "EXPERTO PDF DA APRESENTAÇÃO"}
          </button>
        </div>
      </div>

      {/* Main Visual Carousel Workspace */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8 items-start">
        {/* Slides Slider Container (Columns 1-8) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="bg-neutral-900/40 border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden aspect-[16/10] flex flex-col justify-between group min-h-[380px]">
            {/* Slide glow background decoration */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${slides[currentSlide].color} blur-3xl rounded-full transition-all duration-700 pointer-events-none`} />

            {/* Slide Header area */}
            <div className="flex justify-between items-center relative">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                 {slides[currentSlide].category}
               </span>
               <span className="text-[11px] font-mono font-black text-neutral-500 uppercase">
                 Slide {slides[currentSlide].id} de {slides.length}
               </span>
            </div>

            {/* Body Slide Text area */}
            <div className="my-8 relative space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                   {slides[currentSlide].icon}
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-white">
                  {slides[currentSlide].title}
                </h2>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl font-medium">
                {slides[currentSlide].description}
              </p>

              {/* Bullet points for the active slide */}
              <div className="grid gap-3 pt-4">
                {slides[currentSlide].bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-neutral-400 font-medium leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Slide details area */}
            <div className="flex justify-between items-center pt-6 border-t border-white/5 relative">
               <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">
                 {slides[currentSlide].meta}
               </span>
               
               <div className="flex gap-2">
                 <button 
                   onClick={handlePrev} 
                   className="p-2.5 hover:bg-white/5 border border-white/5 rounded-xl transition-colors active:scale-95"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={handleNext} 
                   className="p-2.5 hover:bg-white/5 border border-white/5 rounded-xl transition-colors active:scale-95"
                 >
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2">
            {slides.map((slide, idx) => (
              <button 
                key={slide.id}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-amber-500' : 'w-2 bg-neutral-800'}`}
              />
            ))}
          </div>
        </div>

        {/* Side panel index card list (Columns 9-12) */}
        <div className="md:col-span-4 space-y-4">
           <div className="bg-neutral-900/20 border border-white/5 rounded-3xl p-6 space-y-6">
              <h3 className="text-[10px] font-black tracking-widest text-neutral-500 uppercase flex items-center gap-2">
                 <Presentation className="w-3.5 h-3.5 text-amber-500" /> ÍNDICE DA PROPOSTA
              </h3>

              <div className="grid gap-2">
                {slides.map((slide, idx) => {
                  const isActive = currentSlide === idx;
                  return (
                    <button 
                      key={slide.id}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 active:scale-[0.98] ${
                        isActive 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                        : 'bg-black/20 border-white/[0.02] text-neutral-500 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className={`text-[10px] font-black font-mono w-5 h-5 rounded-lg flex items-center justify-center ${isActive ? 'bg-amber-500 text-black' : 'bg-white/5 text-neutral-400'}`}>
                        {slide.id}
                      </span>
                      <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-black uppercase truncate tracking-wider">{slide.title}</div>
                         <div className="text-[8px] font-bold text-neutral-500 uppercase tracking-tighter truncate mt-0.5">{slide.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Floating tech overview sticker */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                 <FileText className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                 <div className="space-y-1">
                    <p className="text-[10px] text-amber-400 font-bold">Fácil Exportação PDF:</p>
                    <p className="text-[9px] text-amber-500/70 leading-relaxed font-medium">
                      O arquivo PDF exportado é dinamicamente estruturado no formato paisagem (A4 slide deck), ideal para envio via WhatsApp ou emails de negócios a potenciais parceiros.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
