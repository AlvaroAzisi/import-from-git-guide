CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;