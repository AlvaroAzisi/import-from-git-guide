CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;