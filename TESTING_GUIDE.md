# 📋 Teste Manual: Confirmação de Agendamento via WhatsApp

## Objetivo
Validar que os agendamentos realizados pela secretária virtual (Kênia) via WhatsApp estão sendo **confirmados corretamente no dashboard da Agenda**.

---

## 🔍 Pré-requisitos

1. ✅ Sistema rodando localmente: `npm run dev`
2. ✅ Supabase conectado e sincronizado
3. ✅ Acesso ao dashboard em: `http://localhost:5173`
4. ✅ Acesso ao painel de Agenda

---

## 🧪 Teste 1: Agendamento + Confirmação (Fluxo Completo)

### Passo 1: Agendar via Chat IA (Secretária)
1. Abra a aba **"Chat IA"** no dashboard
2. Digite: `Gostaria de agendar uma consulta para terça-feira às 14:30`
3. Clique em **"Enviar"**
4. A secretária deve responder com confirmação

**Esperado:**
- ✅ Agendamento aparece no painel com status `scheduled`
- ✅ Data/hora corretas no scheduler

### Passo 2: Confirmar no Painel
1. Preencha o campo **"Data"** e **"Horário"** no scheduler
2. Clique em **"Confirmar"**
3. Aguarde a mensagem de sucesso

**Esperado:**
- ✅ Toast: "Agendamento confirmado"
- ✅ Painel fecha automaticamente

### Passo 3: Verificar no Dashboard da Agenda
1. Clique na aba **"Agenda"** (ou navegue para `/agenda`)
2. Verifique o filtro: deve estar em **"ativos"**
3. Procure pelo agendamento recém-criado

**Esperado:**
- ✅ Agendamento aparece na lista com status **"confirmado"**
- ✅ Data, hora e cliente visíveis
- ✅ Indicador visual mostrando status "confirmado" ✔️

---

## 🧪 Teste 2: Confirmação via WhatsApp (Simulação)

### Passo 1: Criar agendamento via API
Execute este comando no console do navegador (DevTools):

```javascript
// Simular inserção de mensagem WhatsApp de agendamento
const response = await fetch('/api/whatsapp/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact_id: 'test-contact-001',
    contact_phone: '5511987654321',
    contact_name: 'Cliente Teste',
    text: 'Oi Kênia, quero agendar para sexta-feira às 10h00',
    from_me: false,
    created_at: new Date().toISOString()
  })
});
console.log(await response.json());
```

**Esperado:**
- ✅ Agendamento criado com status `scheduled`
- ✅ Resposta HTTP 200/201

### Passo 2: Confirmar via WhatsApp
Execute no console:

```javascript
// Simular confirmação via WhatsApp
const confirmResponse = await fetch('/api/whatsapp/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact_id: 'test-contact-001',
    contact_phone: '5511987654321',
    text: 'Confirmado! Agendamento confirmado para sexta-feira às 10h00',
    from_me: false,
    created_at: new Date().toISOString()
  })
});
console.log(await confirmResponse.json());
```

### Passo 3: Verificar Status
1. Acesse a aba **Agenda**
2. Faça refresh da página (F5 ou Cmd+R)
3. Procure pelo agendamento do "Cliente Teste"

**Esperado:**
- ✅ Status mudou de `scheduled` para **`confirmado`**
- ✅ Campo `source` deve ser `whatsapp_confirmation`
- ✅ Agendamento visível na lista de "ativos"

---

## 🧪 Teste 3: Reagendamento

### Passo 1: Reagendar via WhatsApp
Execute:

```javascript
const rescheduleResponse = await fetch('/api/whatsapp/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact_id: 'test-contact-001',
    contact_phone: '5511987654321',
    text: 'Oi, preciso reagendar para segunda-feira às 16h00',
    from_me: false,
    created_at: new Date().toISOString()
  })
});
console.log(await rescheduleResponse.json());
```

### Passo 2: Verificar Reagendamento
1. Acesse a aba **Agenda**
2. Procure pelo agendamento do "Cliente Teste"

**Esperado:**
- ✅ Data/hora foram atualizadas para segunda-feira 16:00
- ✅ Status voltou a `scheduled` (aguardando confirmação nova)
- ✅ Campo `source` é `whatsapp_reschedule`

---

## 🛠️ Inspeção de Dados no Banco

### Query para verificar agendamentos no Supabase:

```sql
SELECT 
  id,
  client_name,
  phone,
  appointment_date,
  appointment_time,
  status,
  source,
  raw_payload,
  created_at,
  updated_at
FROM public.appointments
WHERE phone LIKE '%5511987654321%'
  OR phone LIKE '%5511999999%'
ORDER BY created_at DESC
LIMIT 20;
```

**O que procurar:**
- ✅ `status` = `'confirmado'` ou `'scheduled'`
- ✅ `source` = `'whatsapp_confirmation'` ou `'whatsapp_trigger'`
- ✅ `raw_payload` contém `confirmed_by_watzzap: true`
- ✅ `updated_at` foi atualizado após confirmação

### Query para verificar mensagens WhatsApp:

```sql
SELECT 
  id,
  contact_id,
  contact_phone,
  text,
  from_me,
  created_at
FROM public.whatsapp_messages
WHERE contact_phone LIKE '%987654321%'
  OR contact_phone LIKE '%999999%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## ✅ Checklist de Validação

### Fluxo de Agendamento
- [ ] Secretária pode agendar via chat
- [ ] Agendamento aparece no dashboard com status correto
- [ ] Data/hora são preservadas corretamente
- [ ] Cliente pode confirmar no chat

### Fluxo de Confirmação via WhatsApp
- [ ] Mensagem com "confirmado" muda o status para `confirmado`
- [ ] Campo `raw_payload` registra timestamp de confirmação
- [ ] Agendamento aparece na lista de "ativos" do dashboard
- [ ] Badge de status mostra ✔️ confirmado

### Fluxo de Reagendamento
- [ ] Mensagem com "reagendar" atualiza data/hora
- [ ] Status volta a `scheduled`
- [ ] `source` muda para `whatsapp_reschedule`

### Integridade de Dados
- [ ] Nenhum agendamento duplicado
- [ ] Histórico de confirmação preservado em `raw_payload`
- [ ] Timestamps acurados (timezone São Paulo)
- [ ] Dados do cliente não são perdidos

---

## 🐛 Resolução de Problemas

### ❌ "Agendamento não aparece no dashboard"
**Solução:**
1. Verifique se `status = 'confirmado'`
2. Verifique se `appointment_date >= hoje`
3. Faça refresh da página (F5)
4. Verifique logs do Supabase: `supabase logs`

### ❌ "Status não muda para confirmado"
**Solução:**
1. Verifique se a mensagem contém "confirmado"
2. Verifique se o trigger foi acionado: `supabase functions logs`
3. Tente executar a migração novamente: `supabase db push`

### ❌ "Erro ao confirmar agendamento"
**Solução:**
1. Verifique se o cliente está autenticado
2. Verifique permissões RLS no Supabase
3. Veja o console do navegador (DevTools → Console)

---

## 📊 Exemplo de Resposta Esperada

### Agendamento Criado (via Chat)
```json
{
  "id": "uuid-123",
  "client_name": "João Silva",
  "phone": "5511987654321",
  "appointment_date": "2026-07-18",
  "appointment_time": "14:30:00",
  "status": "confirmado",
  "source": "chat_ia",
  "raw_payload": {
    "source": "chat_ia",
    "meet_link": "https://meet.jit.si/...",
    "duration": 60
  },
  "created_at": "2026-07-14T14:30:00Z"
}
```

### Agendamento Confirmado (via WhatsApp)
```json
{
  "id": "uuid-456",
  "client_name": "Maria Santos",
  "phone": "5511999999999",
  "appointment_date": "2026-07-16",
  "appointment_time": "10:00:00",
  "status": "confirmado",
  "source": "whatsapp_confirmation",
  "raw_payload": {
    "confirmed_at": "2026-07-14T10:15:32Z",
    "confirmed_by_watzzap": true,
    "confirmation_text": "Confirmado! Agendamento confirmado..."
  },
  "updated_at": "2026-07-14T10:15:32Z"
}
```

---

## 📝 Notas Importantes

1. **Timezone**: Todos os horários são em **America/Sao_Paulo** (Brasília)
2. **Formato de Data**: `YYYY-MM-DD`
3. **Formato de Hora**: `HH:MM:SS` (24h)
4. **Polling**: Dashboard faz polling a cada 30s para sincronizar agendamentos
5. **Determinístico**: Mensagens WhatsApp com mesma data/hora não criam duplicatas

---

## 🚀 Próximas Etapas

Após validar todos os testes:
1. ✅ Mergear branch para `main`
2. ✅ Deploy em produção
3. ✅ Monitorar logs de confirmação
4. ✅ Coletar feedback dos usuários
