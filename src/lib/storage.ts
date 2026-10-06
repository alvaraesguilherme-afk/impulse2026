import "server-only";
import { createClient } from "@supabase/supabase-js";

// Storage do Supabase só pelo servidor, com a service role — o navegador não
// tem mais nenhuma chave do banco.
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const BUCKET = "mural";

export async function subirFotoMural(arquivo: string, dados: Blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(arquivo, dados, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(arquivo).data.publicUrl;
}

export async function apagarFotoMural(arquivo: string) {
  await supabase.storage.from(BUCKET).remove([arquivo]);
}
