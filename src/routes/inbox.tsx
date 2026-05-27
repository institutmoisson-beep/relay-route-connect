import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox as InboxIcon, ExternalLink, Calendar } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["broadcasts"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_broadcasts").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("broadcasts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "msn_broadcasts" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"><InboxIcon className="size-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Boîte canal</h1>
            <p className="text-muted-foreground text-sm">Messages officiels de l'équipe MSN Delivery.</p>
          </div>
        </div>

        {!messages?.length ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <InboxIcon className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun message pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <article key={m.id} className="bg-card border border-border rounded-2xl p-6 shadow-soft">
                <header className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="font-display font-bold text-lg">{m.title}</h2>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Calendar className="size-3" />{new Date(m.created_at).toLocaleString("fr-FR")}</div>
                </header>
                {m.image_url && <img src={m.image_url} alt={m.title} className="rounded-xl mb-4 max-h-80 w-full object-cover" loading="lazy" />}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                {m.link_url && (
                  <a href={m.link_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow">
                    <ExternalLink className="size-4" />{m.link_label || "Ouvrir le lien"}
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
