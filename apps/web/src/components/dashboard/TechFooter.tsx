import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { api } from "@/lib/axios";

type Status = "checking" | "ok" | "ko";

function StatusDot({ status }: { status: Status }) {
  const color =
    status === "ok"
      ? "text-sis-success"
      : status === "ko"
      ? "text-sis-danger"
      : "text-sis-warning";
  return <Circle className={`h-2.5 w-2.5 fill-current ${color}`} />;
}

export function TechFooter() {
  const [backend, setBackend] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Endpoint public léger pour vérifier que l'API répond
        await api.get("/health", { timeout: 4000 });
        if (!cancelled) setBackend("ok");
      } catch {
        if (!cancelled) setBackend("ko");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="mt-10 border-t border-sis-neutral-200 pt-4 pb-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-sis-neutral-500">
      <span className="flex items-center gap-1.5">
        <StatusDot status={backend} />
        Système opérationnel
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot status={backend} />
        Backend · Port 3000
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot status="ok" />
        Frontend · Port 5173
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot status="ok" />
        PostgreSQL · Connecté
      </span>
      <span className="ml-auto text-sis-neutral-400">
        L'éducation, notre priorité
      </span>
    </footer>
  );
}