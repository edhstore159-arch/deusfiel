import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Teste de Integração: Confirmação de Agendamento via WhatsApp
 * 
 * Objetivo: Validar que quando um cliente confirma um agendamento via WhatsApp,
 * o status muda para "confirmado" e aparece no dashboard da Agenda.
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

describe('WhatsApp Appointment Confirmation', () => {
  let testContactId: string;
  let testContactPhone: string;
  let createdAppointmentId: string;

  beforeEach(() => {
    testContactId = `test-contact-${Date.now()}`;
    testContactPhone = `5511999999${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  });

  it('should create appointment from WhatsApp scheduling message', async () => {
    // Simular mensagem do cliente agendando
    const schedulingMessage = {
      contact_id: testContactId,
      contact_phone: testContactPhone,
      contact_name: 'Cliente Teste',
      text: 'Gostaria de agendar uma consulta para terça-feira às 14h00',
      from_me: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert([schedulingMessage])
      .select();

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Aguardar processamento do trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se agendamento foi criado com status "scheduled"
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, source')
      .eq('phone', testContactPhone)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(appointments?.length).toBeGreaterThan(0);
    expect(appointments?.[0].status).toBe('scheduled');
    expect(appointments?.[0].source).toBe('whatsapp_trigger');

    if (appointments?.[0]) {
      createdAppointmentId = appointments[0].id;
    }
  });

  it('should update appointment to "confirmado" when client confirms via WhatsApp', async () => {
    // Primeiro, criar um agendamento
    const { data: newAppointment } = await supabase
      .from('appointments')
      .insert([{
        session_id: testContactId,
        phone: testContactPhone,
        client_name: 'Cliente Teste Confirmação',
        legal_area: 'Atendimento jurídico',
        case_summary: 'Teste de confirmação',
        appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        appointment_time: '14:00:00',
        source: 'whatsapp_trigger',
        status: 'scheduled',
      }])
      .select();

    expect(newAppointment?.length).toBeGreaterThan(0);

    // Simular mensagem de confirmação do cliente
    const confirmationMessage = {
      contact_id: testContactId,
      contact_phone: testContactPhone,
      contact_name: 'Cliente Teste Confirmação',
      text: 'Confirmado! Agendamento confirmado para terça-feira às 14h00',
      from_me: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('whatsapp_messages')
      .insert([confirmationMessage]);

    expect(error).toBeNull();

    // Aguardar processamento do trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se status foi atualizado para "confirmado"
    const { data: updatedAppointment } = await supabase
      .from('appointments')
      .select('status, source, raw_payload')
      .eq('id', newAppointment?.[0].id)
      .single();

    expect(updatedAppointment?.status).toBe('confirmado');
    expect(updatedAppointment?.source).toBe('whatsapp_confirmation');
    
    // Verificar se o payload contém metadados de confirmação
    const payload = updatedAppointment?.raw_payload as Record<string, unknown>;
    expect(payload?.confirmed_by_watzzap).toBe(true);
  });

  it('should display confirmed appointment in dashboard (Agenda)', async () => {
    // Criar agendamento confirmado
    const appointmentDate = new Date(Date.now() + 172800000).toISOString().split('T')[0]; // 2 dias no futuro
    
    const { data: appointment } = await supabase
      .from('appointments')
      .insert([{
        session_id: `dashboard-test-${Date.now()}`,
        phone: testContactPhone,
        client_name: 'Teste Dashboard',
        legal_area: 'Direito Civil',
        case_summary: 'Teste de exibição no dashboard',
        appointment_date: appointmentDate,
        appointment_time: '10:00:00',
        source: 'whatsapp_confirmation',
        status: 'confirmado', // ← IMPORTANTE: deve estar confirmado
      }])
      .select();

    expect(appointment?.length).toBeGreaterThan(0);
    expect(appointment?.[0].status).toBe('confirmado');

    // Simular filtro de "ativos" na página Agenda
    const { data: activeAppointments } = await supabase
      .from('appointments')
      .select('id, client_name, appointment_date, appointment_time, status')
      .eq('status', 'confirmado')
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true });

    // Verificar se o agendamento aparece na listagem
    const foundAppointment = activeAppointments?.find(
      a => a.client_name === 'Teste Dashboard'
    );

    expect(foundAppointment).toBeDefined();
    expect(foundAppointment?.status).toBe('confirmado');
  });

  it('should handle "reagendamento" correctly', async () => {
    // Criar agendamento original
    const { data: originalAppointment } = await supabase
      .from('appointments')
      .insert([{
        session_id: testContactId,
        phone: testContactPhone,
        client_name: 'Cliente Reagendamento',
        legal_area: 'Atendimento jurídico',
        case_summary: 'Teste de reagendamento',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '09:00:00',
        source: 'whatsapp_trigger',
        status: 'scheduled',
      }])
      .select();

    expect(originalAppointment?.length).toBeGreaterThan(0);

    // Simular mensagem de reagendamento
    const rescheduleMessage = {
      contact_id: testContactId,
      contact_phone: testContactPhone,
      text: 'Oi, preciso reagendar para quarta-feira às 15h30',
      from_me: false,
      created_at: new Date().toISOString(),
    };

    await supabase.from('whatsapp_messages').insert([rescheduleMessage]);

    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se o agendamento foi atualizado
    const { data: rescheduledAppointment } = await supabase
      .from('appointments')
      .select('status, source, appointment_time')
      .eq('id', originalAppointment?.[0].id)
      .single();

    expect(rescheduledAppointment?.source).toBe('whatsapp_reschedule');
    expect(rescheduledAppointment?.status).toBe('scheduled');
  });

  it('should log confirmation details in raw_payload', async () => {
    const { data: appointment } = await supabase
      .from('appointments')
      .insert([{
        session_id: testContactId,
        phone: testContactPhone,
        client_name: 'Cliente Payload Test',
        appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        appointment_time: '11:00:00',
        status: 'confirmado',
        source: 'whatsapp_confirmation',
        raw_payload: {
          confirmed_at: new Date().toISOString(),
          confirmed_by_watzzap: true,
          confirmation_text: 'Confirmado! Agendamento confirmado.',
        },
      }])
      .select();

    expect(appointment?.length).toBeGreaterThan(0);

    const payload = appointment?.[0].raw_payload as Record<string, unknown>;
    expect(payload?.confirmed_by_watzzap).toBe(true);
    expect(payload?.confirmation_text).toContain('Confirmado');
  });
});
