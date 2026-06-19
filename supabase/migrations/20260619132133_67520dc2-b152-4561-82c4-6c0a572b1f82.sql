
-- 1. ai_agents: restrict policy to authenticated role
DROP POLICY IF EXISTS "Users manage own agents" ON public.ai_agents;
CREATE POLICY "Users manage own agents" ON public.ai_agents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. appointments: add admin SELECT policy via has_role
CREATE POLICY "Admins can view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. conversations: add INSERT and UPDATE policies for owner
CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. debug_instructions: admin-only
DROP POLICY IF EXISTS "Users manage own debug instructions" ON public.debug_instructions;
CREATE POLICY "Admins manage debug instructions" ON public.debug_instructions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. sessions: restrict UPDATE — split patient/therapist with column-safe trigger
DROP POLICY IF EXISTS "Session participants can update" ON public.sessions;

-- Trigger guards which fields each role may change
CREATE OR REPLACE FUNCTION public.guard_session_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid = OLD.therapist_id THEN
    -- Therapist may change anything except patient_id/therapist_id/price
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.therapist_id IS DISTINCT FROM OLD.therapist_id
       OR NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Therapist cannot change patient_id, therapist_id or price';
    END IF;
    RETURN NEW;
  ELSIF uid = OLD.patient_id THEN
    -- Patient may only update status (e.g., cancel) — everything else stays the same
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.therapist_id IS DISTINCT FROM OLD.therapist_id
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.room_url IS DISTINCT FROM OLD.room_url THEN
      RAISE EXCEPTION 'Patient can only update session status';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Not allowed to update this session';
END;
$$;

DROP TRIGGER IF EXISTS guard_session_update_tr ON public.sessions;
CREATE TRIGGER guard_session_update_tr
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_session_update();

CREATE POLICY "Session participants can update" ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = therapist_id);
