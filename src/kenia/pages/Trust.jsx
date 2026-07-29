import { Link } from "react-router-dom";
import { Card } from "@/kenia/components/ui/card";
import { Shield, Lock, Database, UserCheck, Mail, Scale } from "lucide-react";

const LOGO_IMG = "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/ckw9kwam_IMG-20241228-WA0003.jpg";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background text-nude-900">
      <header className="border-b border-nude-200 bg-card/85 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={LOGO_IMG} alt="Kênia Garcia Advocacia" className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover ring-1 ring-gold-300/50 shrink-0" />
            <div className="font-serif text-base sm:text-lg tracking-tight text-nude-900 leading-tight truncate">
              Kênia Garcia<span className="block overline text-gold-600 text-[10px]">Advocacia</span>
            </div>
          </Link>
          <Link to="/" className="text-sm text-nude-700 hover:text-gold-700">← Início</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-700 text-xs font-medium mb-6">
          <Shield className="w-3.5 h-3.5" /> Confiança e Privacidade
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tighter mb-4">
          Segurança & Privacidade
        </h1>
        <p className="text-nude-700 leading-relaxed mb-2">
          Esta página é mantida pelo escritório <strong>Kênia Garcia Advocacia</strong> para responder às
          dúvidas mais comuns sobre como cuidamos dos seus dados ao usar nossa plataforma. É um documento
          editável pela equipe — não constitui certificação independente.
        </p>
        <p className="text-sm text-nude-600 mb-10">
          Responsabilidade compartilhada: descrevemos os controles do escritório e os recursos da
          plataforma que utilizamos. Práticas operacionais específicas são responsabilidade do escritório;
          os clientes são responsáveis por proteger suas credenciais de acesso.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <Card className="p-5 border-nude-200">
            <Lock className="w-5 h-5 text-gold-700 mb-2" />
            <h3 className="font-display font-semibold text-lg mb-1">Autenticação</h3>
            <p className="text-sm text-nude-700">
              Login por e-mail e senha, com verificação de senhas vazadas (HIBP) ativada e suporte a
              recuperação de senha por e-mail.
            </p>
          </Card>
          <Card className="p-5 border-nude-200">
            <Database className="w-5 h-5 text-gold-700 mb-2" />
            <h3 className="font-display font-semibold text-lg mb-1">Acesso aos dados</h3>
            <p className="text-sm text-nude-700">
              Cada usuário acessa apenas seus próprios dados, garantido por políticas de segurança em nível
              de linha no banco. Anexos são privados e escopados por usuário.
            </p>
          </Card>
          <Card className="p-5 border-nude-200">
            <UserCheck className="w-5 h-5 text-gold-700 mb-2" />
            <h3 className="font-display font-semibold text-lg mb-1">Coleta de dados</h3>
            <p className="text-sm text-nude-700">
              Coletamos nome, contato (WhatsApp/e-mail) e informações que você nos envia voluntariamente
              para prestação dos serviços jurídicos contratados.
            </p>
          </Card>
          <Card className="p-5 border-nude-200">
            <Mail className="w-5 h-5 text-gold-700 mb-2" />
            <h3 className="font-display font-semibold text-lg mb-1">Contato</h3>
            <p className="text-sm text-nude-700">
              Para solicitações de privacidade (LGPD), exclusão de conta ou reporte de incidentes, fale
              conosco pelo formulário da página inicial.
            </p>
          </Card>
        </div>

        <section className="space-y-6 text-sm text-nude-800 leading-relaxed">
          <div>
            <h2 className="font-display font-semibold text-xl text-nude-900 mb-2">Infraestrutura</h2>
            <p>
              A plataforma é executada sobre serviços gerenciados de nuvem que oferecem criptografia em
              trânsito (TLS) e em repouso para o banco de dados e armazenamento de arquivos. A
              autenticação de usuários é fornecida por um serviço gerenciado de identidade.
            </p>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl text-nude-900 mb-2">Retenção e exclusão</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa e pelo período necessário ao
              cumprimento de obrigações legais aplicáveis à advocacia. Você pode solicitar a exclusão da
              sua conta a qualquer momento pelos canais de contato.
            </p>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl text-nude-900 mb-2">Cookies e analytics</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão autenticada. Métricas internas servem
              apenas à operação do escritório e não são compartilhadas com terceiros para fins
              publicitários.
            </p>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl text-nude-900 mb-2">Reporte de vulnerabilidades</h2>
            <p>
              Encontrou um problema de segurança? Entre em contato pelo formulário da página inicial com
              detalhes técnicos — agradecemos divulgação responsável antes de qualquer publicação.
            </p>
          </div>
          <p className="text-xs text-nude-500 pt-4 border-t border-nude-200">
            Esta página descreve práticas e controles atualmente habilitados. Não constitui declaração de
            conformidade com normas específicas (LGPD, ISO, SOC 2 etc.) sem documentação adicional. Para
            cláusulas contratuais específicas, consulte seu contrato de prestação de serviços.
          </p>
        </section>
      </main>

      <footer className="bg-background py-10 border-t border-gold-900/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-nude-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-gold-500 to-gold-700 grid place-items-center">
              <Scale className="w-3 h-3 text-nude-900" />
            </div>
            <span>© 2026 Espírito Santo Adv · Todos os direitos reservados</span>
          </div>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-gold-700">Início</Link>
            <Link to="/login" className="hover:text-gold-700">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
