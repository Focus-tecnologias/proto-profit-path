CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  hourly_cost numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO anon, authenticated;
GRANT ALL ON public.operators TO service_role;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY operators_shared_workspace ON public.operators
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.production_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.print_jobs(id) ON DELETE SET NULL,
  printer_id uuid REFERENCES public.printers(id) ON DELETE SET NULL,
  operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  paused_seconds integer NOT NULL DEFAULT 0,
  paused_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sessions TO anon, authenticated;
GRANT ALL ON public.production_sessions TO service_role;
ALTER TABLE public.production_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_shared_workspace ON public.production_sessions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX production_sessions_status_idx ON public.production_sessions (status);
CREATE INDEX production_sessions_started_idx ON public.production_sessions (started_at DESC);

CREATE TRIGGER update_production_sessions_updated_at
BEFORE UPDATE ON public.production_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();