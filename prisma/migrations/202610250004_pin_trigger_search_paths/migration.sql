-- These trigger functions run as the caller. Pin an empty search path and
-- qualify every referenced CRM table so invocation cannot resolve an object
-- from a caller-controlled schema.

CREATE OR REPLACE FUNCTION public.validate_customer_link() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."linkedType" IS NOT DISTINCT FROM OLD."linkedType"
    AND NEW."linkedId" IS NOT DISTINCT FROM OLD."linkedId" THEN RETURN NEW; END IF;
  IF NEW."linkedId" IS NULL OR NEW."linkedId" = '' THEN RETURN NEW; END IF;
  IF (NEW."linkedType" = 'Deal' AND EXISTS (SELECT 1 FROM public."Deal" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Lead' AND EXISTS (SELECT 1 FROM public."Lead" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Contact' AND EXISTS (SELECT 1 FROM public."Contact" WHERE id = NEW."linkedId")) OR
     (NEW."linkedType" = 'Company' AND EXISTS (SELECT 1 FROM public."Company" WHERE id = NEW."linkedId"))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Linked customer record does not exist' USING ERRCODE = '23503';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_attachment_link() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF (NEW."recordType" = 'Deal' AND EXISTS (SELECT 1 FROM public."Deal" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Lead' AND EXISTS (SELECT 1 FROM public."Lead" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Contact' AND EXISTS (SELECT 1 FROM public."Contact" WHERE id = NEW."recordId")) OR
     (NEW."recordType" = 'Company' AND EXISTS (SELECT 1 FROM public."Company" WHERE id = NEW."recordId"))
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Attachment customer record does not exist' USING ERRCODE = '23503';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_linked_customer_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."Task" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM public."Note" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM public."Activity" WHERE "linkedType" = TG_ARGV[0] AND "linkedId" = OLD.id)
    OR EXISTS (SELECT 1 FROM public."Attachment" WHERE "recordType" = TG_ARGV[0]
      AND "recordId" = OLD.id AND "deletedAt" IS NULL)
  THEN RAISE EXCEPTION 'Customer history must be reassigned before deleting this record'
    USING ERRCODE = '23503'; END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_deal_stage_pipeline() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Stage"
    WHERE id = NEW."stageId" AND "pipelineId" = NEW."pipelineId") THEN
    RAISE EXCEPTION 'Deal stage belongs to another pipeline' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
