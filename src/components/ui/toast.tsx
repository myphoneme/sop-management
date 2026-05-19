import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = Required<ToastInput> & {
  id: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<
  ToastTone,
  { icon: React.ElementType; shell: string; iconShell: string }
> = {
  success: {
    icon: CheckCircle2,
    shell:
      "border-emerald-200 bg-white text-slate-950 shadow-emerald-950/10 dark:border-emerald-400/20 dark:bg-[#101010] dark:text-white",
    iconShell: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  error: {
    icon: AlertTriangle,
    shell:
      "border-rose-200 bg-white text-slate-950 shadow-rose-950/10 dark:border-rose-400/20 dark:bg-[#101010] dark:text-white",
    iconShell: "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-200",
  },
  info: {
    icon: Info,
    shell:
      "border-orange-200 bg-white text-slate-950 shadow-orange-950/10 dark:border-orange-400/20 dark:bg-[#101010] dark:text-white",
    iconShell: "bg-orange-50 text-[#cf5f0d] dark:bg-orange-400/10 dark:text-orange-200",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description = "", tone = "info" }: ToastInput) => {
      const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const toast = { id, title, description, tone };

      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3800);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-[100] grid w-[min(24rem,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          const Icon = styles.icon;

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur animate-in slide-in-from-right-3 fade-in duration-200",
                styles.shell,
              )}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", styles.iconShell)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black tracking-normal">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
