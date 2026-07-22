"use client";

import { create } from "zustand";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface NotificationState {
  notifications: Notification[];
  add: (n: Omit<Notification, "id">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useNotifications = create<NotificationState>((set) => ({
  notifications: [],
  add: (n) => {
    const id = `notif-${++counter}`;
    set((s) => ({ notifications: [...s.notifications, { ...n, id }] }));
    const duration = n.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((x) => x.id !== id),
        }));
      }, duration);
    }
  },
  dismiss: (id) =>
    set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),
  clear: () => set({ notifications: [] }),
}));
