import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import "../../styles/toast.css";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastEmitter: ((msg: string, type?: ToastType, duration?: number) => void) | null = null;

export function triggerGlobalToast(message: string, type: ToastType = "info", durationMs = 3500) {
  if (globalToastEmitter) {
    globalToastEmitter(message, type, durationMs);
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, durationMs }]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss]
  );

  useEffect(() => {
    globalToastEmitter = showToast;
    return () => {
      globalToastEmitter = null;
    };
  }, [showToast]);

  const info = useCallback((msg: string, dur?: number) => showToast(msg, "info", dur), [showToast]);
  const success = useCallback((msg: string, dur?: number) => showToast(msg, "success", dur), [showToast]);
  const warning = useCallback((msg: string, dur?: number) => showToast(msg, "warning", dur), [showToast]);
  const error = useCallback((msg: string, dur?: number) => showToast(msg, "error", dur), [showToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✕";
      case "info":
      default:
        return "ℹ";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, info, success, warning, error, dismiss }}>
      {children}
      {/* Toast live region container */}
      <div
        className="toast-container"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Notificações do sistema"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-card is-${toast.type}`}
            data-testid={`toast-${toast.type}`}
          >
            <div className="toast-content">
              <span className="toast-icon" aria-hidden="true">
                {getToastIcon(toast.type)}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar notificação"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      showToast: triggerGlobalToast,
      info: (m) => triggerGlobalToast(m, "info"),
      success: (m) => triggerGlobalToast(m, "success"),
      warning: (m) => triggerGlobalToast(m, "warning"),
      error: (m) => triggerGlobalToast(m, "error"),
      dismiss: () => {},
    };
  }
  return ctx;
}
