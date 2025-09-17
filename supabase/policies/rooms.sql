CREATE POLICY "Anyone can view public rooms" ON "public"."rooms" FOR SELECT USING (true);
CREATE POLICY "Creators can delete own rooms" ON "public"."rooms" FOR DELETE USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Creators can update own rooms" ON "public"."rooms" FOR UPDATE USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Users can create rooms" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));
CREATE POLICY "Users can read accessible rooms" ON "public"."rooms" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));
CREATE POLICY "Users can update own rooms" ON "public"."rooms" FOR UPDATE USING (("created_by" = "auth"."uid"()));
ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;