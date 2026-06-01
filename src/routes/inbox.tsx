import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox as InboxIcon, ExternalLink, Calendar, Bell, Package, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["broadcasts"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_broadcasts").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  const { data: notifs, refetch: refetchN } = useQuery({
    queryKey: ["my-notifs", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_notifications").select("*").eq("recipient_id", user!.id).order("created_at",{ascending:false}).limit(200)).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("broadcasts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "msn_broadcasts" }, () => refetch())
      .subscribe();
    const ch2 = supabase.channel("notifs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "msn_notifications", filter: `recipient_id=eq.${user.id}` }, () => refetchN())
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(ch2); };
  }, [user, refetch, refetchN]);

  const markAllRead = async () => {
    await supabase.from("msn_notifications").update({ is_read: true }).eq("recipient_id", user!.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["my-notifs"] });
  };
  const unread = (notifs ?? []).filter((n:any)=>!n.is_read).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"><InboxIcon className="size-6 text-primary-foreground" /></div>
            <div>
              <h1 className="text-3xl font-display font-bold">Boîte canal</h1>
              <p className="text-muted-foreground text-sm">Notifications internes + messages de l'équipe MSN.</p>
            </div>
          </div>
          {unread > 0 && <Button variant="outline" onClick={markAllRead}><CheckCheck className="size-4 mr-1" />Tout marquer comme lu</Button>}
        </div>

        <section className="mb-10">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Bell className="size-4 text-primary" />Notifications {unread > 0 && <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unread}</span>}</h2>
          {!notifs?.length ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">Aucune notification interne.</div>
          ) : (
            <div className="space-y-2">
              {notifs.map((n:any) => (
                <div key={n.id} className={`bg-card border rounded-xl p-4 flex items-start gap-3 ${!n.is_read ? "border-primary/60 ring-1 ring-primary/20" : "border-border"}`}>
                  <div className="size-10 rounded-lg bg-accent grid place-items-center text-bronze shrink-0"><Package className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{n.title}</div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                  {!n.is_read && <span className="size-2 rounded-full bg-primary mt-2" />}
                </div>
              ))}
            </div>
          )}
          <Link to="/history" className="text-xs text-primary hover:underline mt-3 inline-block">Voir l'historique complet →</Link>
        </section>

        <section>
          <h2 className="font-bold mb-3">Messages officiels</h2>
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
                    <h3 className="font-display font-bold text-lg">{m.title}</h3>
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
        </section>
      </main>
    </div>
  );
}

