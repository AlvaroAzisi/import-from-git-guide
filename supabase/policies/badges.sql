CREATE POLICY "All users can view badges" ON "public"."badges" FOR SELECT USING (true);

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;