import { CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WelcomeBannerProps {
  bannerUrl?: string;
  subtitle?: string;
}

export function WelcomeBanner({
  bannerUrl,
  subtitle = "Voici un aperçu de votre établissement.",
}: WelcomeBannerProps) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayName = user?.firstName || "utilisateur";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      {/* Carte de gauche */}
      <div className="flex flex-col justify-center rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-3xl">👋</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Bonjour, {displayName} !
          </h1>
        </div>
        <p className="text-sm text-slate-500">{subtitle}</p>
        <div className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-100">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </div>
      </div>

      {/* Carte de droite (Image) */}
      <div
        className="relative hidden min-h-[140px] overflow-hidden rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hidden lg:block lg:min-w-[340px] bg-slate-800"
        style={{
          backgroundImage: `url(${bannerUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-start justify-end p-5 text-white">
          <p className="max-w-[260px] text-sm font-semibold leading-snug md:text-base">
            « Une école aujourd'hui, un meilleur avenir demain »
          </p>
          <p className="mt-1 text-xs font-medium opacity-90">Établissement</p>
        </div>
      </div>
    </div>
  );
}