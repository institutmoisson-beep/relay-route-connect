import { supabase } from "@/integrations/supabase/client";

export async function getMyFranchise(userId: string) {
  const { data } = await supabase
    .from("graine_franchise_contracts")
    .select("id, shop_name, city, neighborhood")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export function fcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
}
