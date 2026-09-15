-- Supabase installs pgcrypto in the `extensions` schema. These SECURITY
-- DEFINER functions intentionally pin their search path, so include that
-- schema explicitly for digest() and gen_random_bytes().
ALTER FUNCTION public.claim_student_access_code(UUID, TEXT, TEXT, TEXT, TEXT)
  SET search_path TO public, extensions;

ALTER FUNCTION public.generate_student_access_codes(UUID, INTEGER)
  SET search_path TO public, extensions;

ALTER FUNCTION public.reset_student_access_code(UUID, UUID)
  SET search_path TO public, extensions;

-- Keep the legacy overload functional for clients that have not yet upgraded
-- to the roll-number-aware claim signature.
ALTER FUNCTION public.claim_student_access_code(UUID, TEXT, TEXT, TEXT)
  SET search_path TO public, extensions;
