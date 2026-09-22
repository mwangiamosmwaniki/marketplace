import React, { createContext, useContext, useState } from "react";
import { AlertTriangle, Check, HelpCircle, X } from "lucide-react";

type DialogKind = "alert" | "confirm" | "prompt";

type DialogRequest = {
  kind: DialogKind;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  resolve: (value: boolean | string | null) => void;
};

interface DialogContextValue {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (
    message: string,
    defaultValue?: string,
    title?: string,
    placeholder?: string,
  ) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const open = (
    kind: DialogKind,
    message: string,
    title: string,
    defaultValue?: string,
    placeholder?: string,
  ) =>
    new Promise<boolean | string | null>((resolve) => {
      setRequest({
        kind,
        message,
        title,
        defaultValue,
        placeholder,
        resolve,
      });
    });

  const close = (value: boolean | string | null) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <DialogContext.Provider
      value={{
        alert: async (message, title = "Notice") => {
          await open("alert", message, title);
        },
        confirm: (message, title = "Please confirm") =>
          open("confirm", message, title).then((value) => value === true),
        prompt: (
          message,
          defaultValue = "",
          title = "Enter value",
          placeholder,
        ) =>
          open("prompt", message, title, defaultValue, placeholder).then(
            (value) => (typeof value === "string" ? value : null),
          ),
      }}
    >
      {children}
      {request && <DialogSurface request={request} onClose={close} />}
    </DialogContext.Provider>
  );
};

const DialogSurface: React.FC<{
  request: DialogRequest;
  onClose: (value: boolean | string | null) => void;
}> = ({ request, onClose }) => {
  const [value, setValue] = useState(request.defaultValue || "");
  const isPrompt = request.kind === "prompt";
  const isAlert = request.kind === "alert";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isAlert
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isAlert ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="dialog-title"
              className="text-sm font-bold text-neutral-950"
            >
              {request.title}
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
              {request.message}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => onClose(isAlert ? null : isPrompt ? null : false)}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isPrompt && (
          <div className="px-5 pt-4">
            <input
              autoFocus
              value={value}
              placeholder={request.placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onClose(value);
              }}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 py-4">
          {!isAlert && (
            <button
              type="button"
              onClick={() => onClose(isPrompt ? null : false)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            autoFocus={!isPrompt}
            onClick={() => onClose(isAlert ? true : isPrompt ? value : true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
          >
            {isAlert ? <Check className="h-3.5 w-3.5" /> : null}
            {isAlert ? "Done" : isPrompt ? "Use value" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used inside DialogProvider");
  }
  return context;
};
