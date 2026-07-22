"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, type NotificationType } from "@/lib/notifications";

const icons: Record<NotificationType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<NotificationType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    text: "text-emerald-900",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red",
    text: "text-red-900",
  },
  info: {
    bg: "bg-blue-light",
    border: "border-blue/20",
    icon: "text-blue",
    text: "text-blue-900",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-600",
    text: "text-amber-900",
  },
};

export function ToastContainer() {
  const { notifications, dismiss } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => {
          const c = colors[n.type];
          const Icon = icons[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto rounded-xl border ${c.border} ${c.bg} shadow-card p-4`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${c.icon} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${c.text}`}>{n.title}</p>
                  {n.message && (
                    <p className={`text-xs mt-0.5 ${c.text} opacity-80`}>
                      {n.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className={`${c.icon} hover:opacity-70 transition-opacity shrink-0`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
