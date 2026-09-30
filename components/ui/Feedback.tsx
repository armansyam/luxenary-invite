"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

type DialogState =
  | { type: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

interface FeedbackApi {
  notify: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const TOAST_DURATION_MS = 3800;

const TOAST_STYLE: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-white text-stone-800",
  error: "border-rose-200 bg-white text-stone-800",
  info: "border-stone-200 bg-white text-stone-800",
};

const TOAST_DOT: Record<ToastKind, string> = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  info: "bg-stone-400",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const nextToastId = useRef(0);

  const notify = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const closeDialog = useCallback((state: DialogState, result: boolean | string | null) => {
    if (state.type === "confirm") state.resolve(result === true);
    else state.resolve(typeof result === "string" ? result : null);
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog((prev) => {
        if (prev?.type === "confirm") prev.resolve(false);
        if (prev?.type === "prompt") prev.resolve(null);
        return { type: "confirm", options, resolve };
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setDialog((prev) => {
        if (prev?.type === "confirm") prev.resolve(false);
        if (prev?.type === "prompt") prev.resolve(null);
        return { type: "prompt", options, resolve };
      });
    });
  }, []);

  const api = useMemo<FeedbackApi>(() => ({ notify, confirm, prompt }), [notify, confirm, prompt]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} />
      {dialog && <DialogView state={dialog} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback harus dipakai di dalam <FeedbackProvider>.");
  }
  return ctx;
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${TOAST_STYLE[t.kind]}`}
        >
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TOAST_DOT[t.kind]}`} aria-hidden="true" />
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function DialogView({
  state,
  onClose,
}: {
  state: DialogState;
  onClose: (state: DialogState, result: boolean | string | null) => void;
}) {
  const isPrompt = state.type === "prompt";
  const [value, setValue] = useState(isPrompt ? state.options.initialValue ?? "" : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    if (isPrompt) inputRef.current?.select();
    else cancelRef.current?.focus();
    return () => {
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [isPrompt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(state, isPrompt ? null : false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state, isPrompt, onClose]);

  const { title, message } = state.options;
  const confirmLabel = state.options.confirmLabel ?? (isPrompt ? "Simpan" : "Ya, lanjutkan");
  const cancelLabel = state.type === "confirm" ? state.options.cancelLabel ?? "Batal" : "Batal";
  const danger = state.type === "confirm" && state.options.danger === true;

  const submit = () => onClose(state, isPrompt ? value : true);
  const cancel = () => onClose(state, isPrompt ? null : false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        role={isPrompt ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby={message ? "feedback-dialog-message" : undefined}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl"
      >
        <h2 id="feedback-dialog-title" className="text-base font-semibold text-stone-900">
          {title}
        </h2>
        {message && (
          <p id="feedback-dialog-message" className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {message}
          </p>
        )}

        {state.type === "prompt" && (
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={state.options.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={submit}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-stone-900 hover:bg-stone-800"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
