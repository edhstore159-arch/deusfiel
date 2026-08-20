-- =====================================================
-- PLATAFORMA DE APPS - 4 TABELAS PRINCIPAIS
-- =====================================================

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Aplicativos
CREATE TABLE IF NOT EXISTS platform_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'published', 'archived')),
  platform TEXT DEFAULT 'both' CHECK (platform IN ('ios', 'android', 'both')),
  bundle_id TEXT,
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Funcionalidades (Features)
CREATE TABLE IF NOT EXISTS platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES platform_apps(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES platform_users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP WITH TIME ZONE,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_platform_apps_user_id ON platform_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_features_app_id ON platform_features(app_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_user_id ON platform_subscriptions(user_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: usuários só veem seus próprios dados
CREATE POLICY "Users read own profile" ON platform_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users read own apps" ON platform_apps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create apps" ON platform_apps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own apps" ON platform_apps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own apps" ON platform_apps
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own features" ON platform_features
  FOR SELECT USING (
    app_id IN (SELECT id FROM platform_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own features" ON platform_features
  FOR ALL USING (
    app_id IN (SELECT id FROM platform_apps WHERE user_id = auth.uid())
  );

CREATE POLICY "Users read own subscriptions" ON platform_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================
INSERT INTO platform_users (id, email, password, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@deusfiel.com', 'admin123', 'Admin DeusFiel')
ON CONFLICT (email) DO NOTHING;
