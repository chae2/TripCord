import { createClient } from "@supabase/supabase-js";
import { request } from "undici";
import { env } from "../config/env";

const supabase = env.supabaseUrl && env.supabaseServiceKey ? createClient(env.supabaseUrl, env.supabaseServiceKey) : null;

/** Discord 첨부파일을 다운로드해 Supabase Storage에 올리고 공개 URL을 반환한다. */
export async function mirrorAttachment(params: {
  attachmentUrl: string;
  fileName: string;
  tripId: string;
  contentType: string;
}): Promise<string> {
  if (!supabase) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY가 설정되어 있지 않아요.");
  }

  const res = await request(params.attachmentUrl);
  const buffer = Buffer.from(await res.body.arrayBuffer());

  const path = `${params.tripId}/${Date.now()}-${params.fileName}`;
  const { error } = await supabase.storage.from(env.supabasePhotoBucket).upload(path, buffer, {
    contentType: params.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  }

  const { data } = supabase.storage.from(env.supabasePhotoBucket).getPublicUrl(path);
  return data.publicUrl;
}
