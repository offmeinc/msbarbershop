import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  message: string;
  timestamp: any;
  type: 'booking' | 'cancellation' | 'update';
  read: boolean;
}

interface NotificationModalProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ notifications, onClose, onMarkAsRead }) => {
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length > 0) {
      // Show the most recent unread
      setLatestNotification(unread[0]);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        onMarkAsRead(unread[0].id);
        setLatestNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
        setLatestNotification(null);
    }
  }, [notifications]);

  return (
    <AnimatePresence>
      {latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 24,
            mass: 0.9
          }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 z-[100] bg-neutral-900/90 backdrop-blur-lg border border-amber-500/30 p-4 rounded-2xl shadow-2xl flex items-start gap-4"
        >
          <div className="p-2 bg-amber-500/20 text-amber-500 rounded-full shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Nova Notificação</h4>
            <p className="text-xs text-neutral-300 mt-1">{latestNotification.message}</p>
            <p className="text-[9px] text-neutral-500 mt-2 font-bold uppercase">
              {latestNotification.timestamp?.toDate ? format(latestNotification.timestamp.toDate(), "HH:mm", { locale: ptBR }) : "Agora"}
            </p>
          </div>
          <button onClick={() => { onMarkAsRead(latestNotification.id); setLatestNotification(null); }} className="text-neutral-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
