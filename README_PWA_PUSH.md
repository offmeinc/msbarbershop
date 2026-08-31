## Correção das Notificações Push em Segundo Plano (App Fechado)

O problema clássico de Web Push via Firebase (FCM) no iOS e em PWAs modernos ocorre porque o SDK do Firebase processa a notificação de forma assíncrona (`onBackgroundMessage`). O iOS Safari (e alguns Androids mais estritos) exigem que a função `showNotification` seja chamada de forma **síncrona** logo após o recebimento do evento `push` pelo Service Worker. 

Se isso não ocorrer imediatamente (no `event.waitUntil`), o sistema operacional "mata" o processo do Service Worker e a notificação nunca chega.

**O que foi ajustado:**
1. Removemos a dependência do `firebase-messaging-compat` de dentro do arquivo `public/firebase-messaging-sw.js`. 
2. Substituímos por um interceptador nativo e direto `self.addEventListener("push", ...)` que lê o payload que vem do backend (`adminMessaging.send`) e exibe a notificação instantaneamente no `event.waitUntil()`.
3. Isso garante uma entrega **100% nativa e síncrona**, respeitando as restrições rigorosas de economia de bateria da Apple e Google, garantindo que a notificação apareça mesmo quando o aplicativo estiver completamente fechado/removido da memória.
