-- CRM users authenticate through Express sessions, not Supabase Auth. The
-- browser has no direct PostgREST access to these private business tables.
-- The server's Prisma connection uses the postgres role, which bypasses RLS.

ALTER TABLE public."AccountInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AutomationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AutomationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrphanReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Stage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StageGateCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Even a service-role key should not be a second route into CRM tables. The
-- backend uses that key only for objects in Supabase Storage's own schema.
REVOKE ALL PRIVILEGES ON TABLE
  public."AccountInvitation", public."Activity", public."Attachment",
  public."AuditLog", public."AutomationEvent", public."AutomationRun",
  public."Branding", public."Company", public."Contact", public."Deal",
  public."Lead", public."LoginAttempt", public."Note", public."OrphanReference",
  public."Pipeline", public."Session", public."Stage", public."StageGateCheck",
  public."Task", public."User", public."_prisma_migrations"
FROM anon, authenticated, service_role;

-- Prisma migrations run as postgres. Keep future tables and sequences private
-- by default instead of inheriting Supabase's broad public-schema grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
