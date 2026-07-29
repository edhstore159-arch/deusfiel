import { describe, it, expect } from "vitest";
import {
  DEFAULT_KENIA_PROMPT,
  renderKeniaPrompt,
} from "./keniaPrompt.js";

import { CHAT_DEFAULT_PROMPT } from "../storage/chatSecretary.js";

// ---------------------------------------------------------------------------
// Validação do Prompt Principal — Kenia Voice Prompt
// ---------------------------------------------------------------------------
describe("Prompt Kenia — Treinamento de Captação", () => {
  it("contém seção de captação de clientes", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("CAPTAÇÃO DE CLIENTES");
    expect(DEFAULT_KENIA_PROMPT).toContain("ESTRATÉGIAS DE MARKETING E CONVERSÃO");
  });

  it("contém técnicas de conversão", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Técnicas de Conversão");
    expect(DEFAULT_KENIA_PROMPT).toContain("Escuta Ativa com Perguntas Estratégicas");
    expect(DEFAULT_KENIA_PROMPT).toContain("Criação de Urgência (Ética)");
    expect(DEFAULT_KENIA_PROMPT).toContain("Tratamento de Objeções");
    expect(DEFAULT_KENIA_PROMPT).toContain("Gatilhos Psicológicos");
  });

  it("contém gatilhos psicológicos corretos", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Reciprocidade");
    expect(DEFAULT_KENIA_PROMPT).toContain("Prova Social");
    expect(DEFAULT_KENIA_PROMPT).toContain("Escassez");
    expect(DEFAULT_KENIA_PROMPT).toContain("Autoridade");
    expect(DEFAULT_KENIA_PROMPT).toContain("Afinidade");
  });

  it("contém scripts para situações comuns", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead com Interesse em Divórcio");
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead com Interesse em Aposentadoria");
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead com Interesse em Direito Bancário");
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead Hesitante");
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead com Urgência");
    expect(DEFAULT_KENIA_PROMPT).toContain("Após Responder Dúvida Jurídica");
  });

  it("contém fluxo de conversão", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Fluxo de Conversão");
    expect(DEFAULT_KENIA_PROMPT).toContain("Fluxo Ideal");
    expect(DEFAULT_KENIA_PROMPT).toContain("Lead chega");
    expect(DEFAULT_KENIA_PROMPT).toContain("Agendamento");
  });

  it("contém coleta de informações essenciais", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Coleta de Informações Essenciais");
    expect(DEFAULT_KENIA_PROMPT).toContain("Nome do cliente");
    expect(DEFAULT_KENIA_PROMPT).toContain("Área jurídica");
    expect(DEFAULT_KENIA_PROMPT).toContain("Contato");
    expect(DEFAULT_KENIA_PROMPT).toContain("Cidade/estado");
  });

  it("contém tratamento de objeções", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Não tenho dinheiro");
    expect(DEFAULT_KENIA_PROMPT).toContain("Vou pensar");
    expect(DEFAULT_KENIA_PROMPT).toContain("Já tenho advogado");
    expect(DEFAULT_KENIA_PROMPT).toContain("É muito complicado");
    expect(DEFAULT_KENIA_PROMPT).toContain("Não sei se tenho direito");
  });

  it("contém indicação estruturada", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Indicação Estruturada");
  });

  it("mantém seções originais do prompt", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("MISSÃO");
    expect(DEFAULT_KENIA_PROMPT).toContain("COMO CONVERSAR");
    expect(DEFAULT_KENIA_PROMPT).toContain("DADOS DO ESCRITÓRIO");
    expect(DEFAULT_KENIA_PROMPT).toContain("ESTILO DE VOZ");
    expect(DEFAULT_KENIA_PROMPT).toContain("CONFIRMAÇÃO DE AGENDAMENTO");
  });

  it("renderiza corretamente com variáveis", () => {
    const rendered = renderKeniaPrompt(DEFAULT_KENIA_PROMPT, {
      dateContext: "Hoje é segunda-feira, 22 de julho de 2026.",
      ctxSummary: "\n## CONTEXTO DO ESCRITÓRIO\n3 clientes ativos.",
      jusContext: "\n## CONTEXTO JURÍDICO\nÁreas: Família, Previdenciário.",
    });

    expect(rendered).toContain("Hoje é segunda-feira, 22 de julho de 2026.");
    expect(rendered).toContain("3 clientes ativos");
    expect(rendered).toContain("Áreas: Família, Previdenciário");
    expect(rendered).toContain("CAPTAÇÃO DE CLIENTES");
  });
});

// ---------------------------------------------------------------------------
// Validação do Prompt de Chat — Chat Secretary
// ---------------------------------------------------------------------------
describe("Prompt Chat Secretary — Treinamento de Captação", () => {
  it("contém identidade da secretária", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("IDENTIDADE");
    expect(CHAT_DEFAULT_PROMPT).toContain("secretária jurídica humana");
  });

  it("contém missão de captação", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("MISSÃO");
    expect(CHAT_DEFAULT_PROMPT).toContain("Converter consultas em agendamentos");
    expect(CHAT_DEFAULT_PROMPT).toContain("Nutrir leads");
  });

  it("contém estratégias de captação", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("ESTRATÉGIAS DE CAPTAÇÃO");
    expect(CHAT_DEFAULT_PROMPT).toContain("Identificação de Leads de Alta Conversão");
    expect(CHAT_DEFAULT_PROMPT).toContain("Técnicas de Conversão");
  });

  it("contém técnicas de conversão", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("Escuta Ativa com Perguntas Estratégicas");
    expect(CHAT_DEFAULT_PROMPT).toContain("Criação de Urgência (Ética)");
    expect(CHAT_DEFAULT_PROMPT).toContain("Tratamento de Objeções");
    expect(CHAT_DEFAULT_PROMPT).toContain("Gatilhos Psicológicos");
  });

  it("contém fluxo de atendimento", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("FLUXO DE ATENDIMENTO");
    expect(CHAT_DEFAULT_PROMPT).toContain("Saudação");
    expect(CHAT_DEFAULT_PROMPT).toContain("Coleta progressiva de dados");
    expect(CHAT_DEFAULT_PROMPT).toContain("Agendamento");
    expect(CHAT_DEFAULT_PROMPT).toContain("Confirmação e follow-up");
  });

  it("contém informações do escritório", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("INFORMAÇÕES DO ESCRITÓRIO");
    expect(CHAT_DEFAULT_PROMPT).toContain("Dra. Kênia Garcia");
    expect(CHAT_DEFAULT_PROMPT).toContain("Família e Sucessões");
    expect(CHAT_DEFAULT_PROMPT).toContain("Previdenciário");
    expect(CHAT_DEFAULT_PROMPT).toContain("Bancário");
    expect(CHAT_DEFAULT_PROMPT).toContain("(64) 99988-1043");
  });

  it("contém regras de comportamento", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("REGRAS");
    expect(CHAT_DEFAULT_PROMPT).toContain("Nunca diga que é inteligência artificial");
    expect(CHAT_DEFAULT_PROMPT).toContain("UMA pergunta por vez");
  });
});

// ---------------------------------------------------------------------------
// Validação do Prompt do Backend — server.js (via importação indireta)
// ---------------------------------------------------------------------------
describe("Prompt Backend — Treinamento de Captação", () => {
  it("o prompt de voz contém seções de captação", () => {
    const prompt = DEFAULT_KENIA_PROMPT;
    expect(prompt).toContain("CAPTAÇÃO DE CLIENTES");
    expect(prompt).toContain("Identificação de Leads de Alta Conversão");
    expect(prompt).toContain("Técnicas de Conversão");
  });

  it("o prompt de chat contém seções de captação", () => {
    const prompt = CHAT_DEFAULT_PROMPT;
    expect(prompt).toContain("ESTRATÉGIAS DE CAPTAÇÃO");
    expect(prompt).toContain("Identificação de Leads de Alta Conversão");
    expect(prompt).toContain("Técnicas de Conversão");
  });
});

// ---------------------------------------------------------------------------
// Validação de Conteúdo Específico de Marketing
// ---------------------------------------------------------------------------
describe("Conteúdo de Marketing — Validação", () => {
  it("prompt de voz contém termos jurídicos para identificação de leads", () => {
    const termos = [
      "divórcio", "separação", "pensão", "inventário", "herança", "guarda", "alimentos",
      "fui demitido", "me ameaçaram", "preciso de ajuda urgente",
      "me indicaram", "um amigo me falou",
      "quero saber se tenho direito", "como funciona",
    ];

    termos.forEach((termo) => {
      expect(DEFAULT_KENIA_PROMPT).toContain(termo);
    });
  });

  it("prompt de chat contém termos jurídicos para identificação de leads", () => {
    const termos = [
      "divórcio", "separação", "pensão", "inventário", "herança", "guarda", "alimentos",
      "fui demitido", "me ameaçaram", "preciso de ajuda urgente",
      "me indicaram", "um amigo me falou",
      "quero saber se tenho direito", "como funciona",
    ];

    termos.forEach((termo) => {
      expect(CHAT_DEFAULT_PROMPT).toContain(termo);
    });
  });

  it("prompt de voz contém exemplos de respostas para captação", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Entendi sobre o divórcio");
    expect(DEFAULT_KENIA_PROMPT).toContain("Entendo. A Dra. Kênia oferece consulta inicial");
    expect(DEFAULT_KENIA_PROMPT).toContain("Muitos clientes na sua situação");
    expect(DEFAULT_KENIA_PROMPT).toContain("A Dra. Kênia tem agenda limitada");
  });

  it("prompt de chat contém exemplos de respostas para captação", () => {
    expect(CHAT_DEFAULT_PROMPT).toContain("Entendi sobre o divórcio");
    expect(CHAT_DEFAULT_PROMPT).toContain("Entendo. A Dra. Kênia oferece consulta inicial");
    expect(CHAT_DEFAULT_PROMPT).toContain("Muitos clientes na sua situação");
    expect(CHAT_DEFAULT_PROMPT).toContain("A Dra. Kênia tem agenda limitada");
  });
});

// ---------------------------------------------------------------------------
// Validação de Integridade dos Prompts
// ---------------------------------------------------------------------------
describe("Integridade dos Prompts", () => {
  it("prompt de voz não contém placeholders não resolvidos", () => {
    const placeholders = ["{dateContext}", "{ctxSummary}", "{jusContext}"];
    placeholders.forEach((p) => {
      expect(DEFAULT_KENIA_PROMPT).toContain(p);
    });
  });

  it("renderização substitui placeholders corretamente", () => {
    const rendered = renderKeniaPrompt(DEFAULT_KENIA_PROMPT, {
      dateContext: "CONTEXT_DATE",
      ctxSummary: "CONTEXT_SUMMARY",
      jusContext: "CONTEXT_JUS",
    });

    expect(rendered).toContain("CONTEXT_DATE");
    expect(rendered).toContain("CONTEXT_SUMMARY");
    expect(rendered).toContain("CONTEXT_JUS");
    expect(rendered).not.toContain("{dateContext}");
    expect(rendered).not.toContain("{ctxSummary}");
    expect(rendered).not.toContain("{jusContext}");
  });

  it("prompts são strings não vazias", () => {
    expect(DEFAULT_KENIA_PROMPT.length).toBeGreaterThan(1000);
    expect(CHAT_DEFAULT_PROMPT.length).toBeGreaterThan(500);
  });

  it("prompts contêm informações de contato do escritório", () => {
    expect(DEFAULT_KENIA_PROMPT).toContain("Dra. Kênia Garcia");
    expect(DEFAULT_KENIA_PROMPT).toContain("Dra. Kênia Garcia atua há mais de 15 anos");
    expect(CHAT_DEFAULT_PROMPT).toContain("Dra. Kênia Garcia");
    expect(CHAT_DEFAULT_PROMPT).toContain("Dra. Kênia Garcia: mais de 15 anos");
    expect(CHAT_DEFAULT_PROMPT).toContain("Família e Sucessões");
  });
});
