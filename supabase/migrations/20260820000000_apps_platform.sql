-- =====================================================
-- PLATAFORMA DE APLICATIVOS MÓVEIS PERSONALIZADOS
-- =====================================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  company TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'developer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Planos de Assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_apps INT DEFAULT 1,
  max_features INT DEFAULT 5,
  max_storage_mb INT DEFAULT 100,
  has_custom_domain BOOLEAN DEFAULT FALSE,
  has_analytics BOOLEAN DEFAULT TRUE,
  has_api_access BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Assinaturas dos Usuários
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  payment_provider TEXT DEFAULT 'stripe',
  payment_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Aplicativos
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  splash_screen_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#7C3AED',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#1F2937',
  platform TEXT DEFAULT 'both' CHECK (platform IN ('ios', 'android', 'both')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'published', 'archived')),
  version TEXT DEFAULT '1.0.0',
  bundle_id TEXT,
  app_store_url TEXT,
  play_store_url TEXT,
  custom_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Telas/Páginas do App
CREATE TABLE IF NOT EXISTS app_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  screen_type TEXT DEFAULT 'custom' CHECK (screen_type IN ('home', 'profile', 'settings', 'custom', 'webview')),
  layout JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  is_navigable BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, slug)
);

-- Tabela de Recursos/Features Disponíveis
CREATE TABLE IF NOT EXISTS app_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'basic' CHECK (category IN ('basic', 'social', 'ecommerce', 'media', 'utility', 'custom')),
  config_schema JSONB DEFAULT '{}',
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Features instaladas no App
CREATE TABLE IF NOT EXISTS app_installed_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES app_features(id),
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, feature_id)
);

-- Tabela de Componentes UI
CREATE TABLE IF NOT EXISTS app_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID REFERENCES app_screens(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'header', 'hero', 'text', 'image', 'button', 'card', 'list',
    'form', 'input', 'divider', 'spacer', 'video', 'map',
    'carousel', 'tabs', 'accordion', 'modal', 'footer', 'custom'
  )),
  props JSONB DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  parent_id UUID REFERENCES app_components(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Notificações Push
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  deep_link TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Analytics
CREATE TABLE IF NOT EXISTS app_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Builds/Compilações
CREATE TABLE IF NOT EXISTS app_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  build_number INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'success', 'failed')),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  version TEXT NOT NULL,
  build_url TEXT,
  apk_url TEXT,
  ipa_url TEXT,
  error_log TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Webhooks
CREATE TABLE IF NOT EXISTS app_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] DEFAULT ARRAY['*'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Templates
CREATE TABLE IF NOT EXISTS app_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  config JSONB DEFAULT '{}',
  features UUID[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  downloads INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT,
  payment_provider TEXT DEFAULT 'stripe',
  payment_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Logs de Atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  app_id UUID REFERENCES apps(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_app_screens_app_id ON app_screens(app_id);
CREATE INDEX IF NOT EXISTS idx_app_components_screen_id ON app_components(screen_id);
CREATE INDEX IF NOT EXISTS idx_app_installed_features_app_id ON app_installed_features(app_id);
CREATE INDEX IF NOT EXISTS idx_app_analytics_app_id ON app_analytics(app_id);
CREATE INDEX IF NOT EXISTS idx_app_analytics_created_at ON app_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_app_builds_app_id ON app_builds(app_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_installed_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies: usuários só veem seus próprios dados
CREATE POLICY "Users can view own profile" ON app_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON app_users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own apps" ON apps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create apps" ON apps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own apps" ON apps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own apps" ON apps FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own screens" ON app_screens FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own screens" ON app_screens FOR ALL USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own components" ON app_components FOR SELECT USING (
  screen_id IN (
    SELECT s.id FROM app_screens s
    JOIN apps a ON s.app_id = a.id
    WHERE a.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage own components" ON app_components FOR ALL USING (
  screen_id IN (
    SELECT s.id FROM app_screens s
    JOIN apps a ON s.app_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own features" ON app_installed_features FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own features" ON app_installed_features FOR ALL USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own notifications" ON app_notifications FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own notifications" ON app_notifications FOR ALL USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own analytics" ON app_analytics FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own builds" ON app_builds FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create builds" ON app_builds FOR INSERT WITH CHECK (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own webhooks" ON app_webhooks FOR SELECT USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own webhooks" ON app_webhooks FOR ALL USING (
  app_id IN (SELECT id FROM apps WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Features e templates são públicos para leitura
CREATE POLICY "Anyone can view features" ON app_features FOR SELECT USING (true);
CREATE POLICY "Anyone can view templates" ON app_templates FOR SELECT USING (true);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Planos
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_apps, max_features, max_storage_mb, has_custom_domain, has_analytics, has_api_access) VALUES
('Gratuito', 'free', 'Para testar a plataforma', 0, 0, 1, 3, 50, false, false, false),
('Starter', 'starter', 'Para pequenos negócios', 49.90, 479.00, 3, 10, 500, false, true, false),
('Professional', 'professional', 'Para empresas em crescimento', 149.90, 1439.00, 10, 25, 2000, true, true, true),
('Enterprise', 'enterprise', 'Para grandes empresas', 399.90, 3839.00, -1, -1, -1, true, true, true);

-- Features disponíveis
INSERT INTO app_features (name, slug, description, icon, category, config_schema, is_premium) VALUES
('Push Notifications', 'push-notifications', 'Enviar notificações push para usuários', 'bell', 'basic', '{"max_per_day": 100}', false),
('Chat em Tempo Real', 'realtime-chat', 'Chat entre usuários do app', 'message-circle', 'social', '{"max_members": 50}', true),
('Galeria de Fotos', 'photo-gallery', 'Galeria de imagens compartilhadas', 'image', 'media', '{"max_photos": 100}', false),
('Sistema de Pagamentos', 'payments', 'Receber pagamentos no app', 'credit-card', 'ecommerce', '{"currencies": ["BRL","USD"]}', true),
('Mapas e Localização', 'maps-location', 'Mapas interativos e geolocalização', 'map-pin', 'utility', '{"provider": "mapbox"}', true),
('Agendamento', 'scheduling', 'Sistema de agendamento de horários', 'calendar', 'utility', '{"max_appointments": 50}', false),
('Catálogo de Produtos', 'product-catalog', 'Catálogo de produtos com carrinho', 'shopping-bag', 'ecommerce', '{"max_products": 50}', true),
('Login Social', 'social-login', 'Login com Google, Apple, Facebook', 'log-in', 'basic', '{"providers": ["google","apple"]}', false),
('Analytics Básico', 'analytics-basic', 'Métricas de uso do app', 'bar-chart', 'basic', '{}', false),
('Loyalty Program', 'loyalty-program', 'Programa de pontos e recompensas', 'gift', 'social', '{"points_per_real": 1}', true);

-- Templates
INSERT INTO app_templates (name, slug, description, thumbnail_url, category, config, is_premium) VALUES
('Restaurante', 'restaurant', 'App para restaurantes com cardápio e pedidos', NULL, 'food', '{"primary_color":"#E11D48","features":["push-notifications","scheduling","product-catalog"]}', false),
(' Academia', 'gym', 'App para academias com planos e aulas', NULL, 'fitness', '{"primary_color":"#059669","features":["push-notifications","scheduling","social-login"]}', false),
('Loja Virtual', 'ecommerce', 'Loja online com catálogo e pagamentos', NULL, 'ecommerce', '{"primary_color":"#7C3AED","features":["product-catalog","payments","push-notifications"]}', true),
('Clínica', 'clinic', 'App para clínicas com agendamento', NULL, 'health', '{"primary_color":"#0284C7","features":["scheduling","push-notifications","realtime-chat"]}', true),
('Escola', 'school', 'App escolar com notificações e conteúdo', NULL, 'education', '{"primary_color":"#EA580C","features":["push-notifications","photo-gallery","analytics-basic"]}', false),
('Imobiliária', 'real-estate', 'App de imóveis com filtros e tours', NULL, 'business', '{"primary_color":"#0891B2","features":["maps-location","push-notifications","photo-gallery"]}', true);
