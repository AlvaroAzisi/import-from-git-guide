CREATE POLICY "Participants can delete friend requests" ON "public"."friends" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Participants can update friend requests" ON "public"."friends" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user"))) WITH CHECK ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Users can read own friends" ON "public"."friends" FOR SELECT USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Users can send friend requests" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "from_user"));
ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;