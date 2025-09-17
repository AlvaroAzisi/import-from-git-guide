CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;