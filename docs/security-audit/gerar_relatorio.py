#!/usr/bin/env python3
"""
Gerador do Relatório de Auditoria de Segurança — Solo Learning (Solen/Collegium)
Regere com: .venv/bin/python gerar_relatorio.py
"""

import datetime
import io
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate,
    Paragraph, Spacer, Table, TableStyle, Image,
    KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Paleta ──────────────────────────────────────────────────────────────────
COR = {
    'critica':   '#B91C1C',
    'alta':      '#EA580C',
    'media':     '#D97706',
    'baixa':     '#2563EB',
    'forte':     '#059669',
    'bg':        '#0F172A',
    'surface':   '#1E293B',
    'text':      '#F1F5F9',
    'muted':     '#94A3B8',
    'accent':    '#38BDF8',
    'header_bg': '#1E3A5F',
    'row_even':  '#F8FAFC',
    'row_odd':   '#EEF2FF',
}

def hex_to_rgb_frac(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255 for i in (0,2,4))

def hex_color(h):
    r,g,b = (int(h.lstrip('#')[i:i+2], 16) for i in (0,2,4))
    return colors.Color(r/255, g/255, b/255)

# ── Dados dos achados ────────────────────────────────────────────────────────
ACHADOS = [
    {
        'id': 'F1',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'critica',
        'titulo': 'JWT_SECRET com fallback hardcoded no código-fonte',
        'arquivo': 'backend/src/plugins/auth.ts:8',
        'trecho': "secret: process.env.JWT_SECRET || 'supersecret_solen_key_123'",
        'descricao': (
            "O segredo JWT tem um fallback literal 'supersecret_solen_key_123' diretamente no "
            "código-fonte. Qualquer pessoa com acesso ao repositório pode forjar tokens JWT "
            "válidos para qualquer usuário, incluindo ADMIN, se o JWT_SECRET não for definido "
            "no ambiente de produção."
        ),
        'impacto': 'Escalada de privilégio total — forja de tokens arbitrários.',
        'correcao': (
            "Remover o fallback e adicionar validação de startup que lance exceção se "
            "JWT_SECRET estiver ausente ou for o valor padrão conhecido."
        ),
    },
    {
        'id': 'F2',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'critica',
        'titulo': 'Credenciais reais commitadas no .env rastreado pelo git',
        'arquivo': 'backend/.env:1-11',
        'trecho': (
            'DATABASE_URL="postgresql://solen_user:solen_password@..."\n'
            'JWT_SECRET="supersecretjwtkey"\n'
            'GEMINI_API_KEY="AQ.Ab8RN6Lx..."\n'
            'NVIDIA_API_KEY="nvapi-ZDg3qfS5..."\n'
            'SMTP_PASS="ufer gsek fyhh rmhb"'
        ),
        'descricao': (
            "O arquivo .env com credenciais reais (banco de dados, JWT, APIs Gemini/Nvidia, "
            "senha de app Gmail) está presente no repositório e rastreado pelo git. O commit "
            "'25b0923 — Remove chave no .env' (2026-08-03) modificou o arquivo mas ele ainda "
            "existe na árvore de trabalho com valores reais. Credenciais antigas permanecem "
            "acessíveis no histórico do git."
        ),
        'impacto': 'Comprometimento de todas as credenciais: banco, AI, e-mail.',
        'correcao': (
            "1. Adicionar backend/.env ao .gitignore imediatamente. "
            "2. Rotacionar TODAS as credenciais expostas. "
            "3. Usar git-filter-repo para expurgar o arquivo do histórico."
        ),
    },
    {
        'id': 'F3',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'alta',
        'titulo': 'Senha padrão de Arquiteto hardcoded e exposta na UI',
        'arquivo': 'backend/src/routes/superadmin.ts:99,348 / frontend/app/(superadmin)/dashboard.tsx:377,716,1179',
        'trecho': "const rawPassword = password || 'Solen2026';",
        'descricao': (
            "A senha padrão 'Solen2026' está hardcoded no código de criação e reset de "
            "Arquitetos, e também exibida literalmente na UI do superadmin. Qualquer "
            "Arquiteto que nunca trocou a senha (isFirstAccess=true) pode ser acessado com "
            "essa senha conhecida publicamente pelo código."
        ),
        'impacto': 'Comprometimento de contas de Arquiteto com acesso administrativo à instituição.',
        'correcao': (
            "Gerar senhas aleatórias fortes na criação/reset de arquitetos. "
            "Remover a senha do texto da UI e comunicá-la por canal seguro."
        ),
    },
    {
        'id': 'F4',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'alta',
        'titulo': 'Credenciais PostgreSQL hardcoded no docker-compose.yml',
        'arquivo': 'backend/docker-compose.yml:6-8',
        'trecho': 'POSTGRES_USER: solen_user\nPOSTGRES_PASSWORD: solen_password\nPOSTGRES_DB: solen_db',
        'descricao': (
            "O docker-compose.yml define credenciais padrão previsíveis para o banco "
            "PostgreSQL. Esses mesmos valores aparecem no DATABASE_URL do .env. Se o container "
            "for exposto ou o compose usado em produção sem override, a senha é trivialmente "
            "conhecida."
        ),
        'impacto': 'Acesso direto ao banco de dados de produção.',
        'correcao': (
            "Usar variáveis de ambiente (${POSTGRES_PASSWORD}) sem defaults no docker-compose "
            "e definir senhas fortes em .env não rastreado."
        ),
    },
    {
        'id': 'F5',
        'categoria': 'CAT-5 Webhook sem Autenticação',
        'severidade': 'alta',
        'titulo': 'Endpoint de webhook de billing sem verificação de assinatura',
        'arquivo': 'backend/src/routes/webhooks.ts:6-43',
        'trecho': (
            "fastify.post('/billing/webhook', async (request, reply) => {\n"
            "  // Sem autenticação, sem verificação de assinatura HMAC\n"
            "  if (type === 'invoice.paid') { /* ATIVA conta */ }"
        ),
        'descricao': (
            "O webhook de billing não valida a assinatura do payload (HMAC-SHA256 do Stripe/"
            "Asaas). Qualquer ator pode enviar um POST para /webhooks/billing/webhook com "
            "'type': 'invoice.paid' e um institutionId arbitrário, ativando gratuitamente "
            "qualquer conta bloqueada ou inadimplente."
        ),
        'impacto': 'Fraude: ativação de contas inadimplentes sem pagamento; DoS: bloqueio de contas pagantes.',
        'correcao': (
            "Implementar verificação de assinatura HMAC-SHA256 usando o segredo de webhook "
            "do gateway de pagamento antes de processar qualquer evento."
        ),
    },
    {
        'id': 'F6',
        'categoria': 'CAT-3 IDOR',
        'severidade': 'media',
        'titulo': 'GET /quests/subject-stats/:userId sem verificação de posse/tenant',
        'arquivo': 'backend/src/routes/quests.ts:2800-2892',
        'trecho': (
            "fastify.get('/subject-stats/:userId', ..., async (request, reply) => {\n"
            "  // Verifica role, mas NÃO verifica se userId pertence à instituição do caller\n"
            "  const student = await prisma.user.findUnique({ where: { id: userId } });"
        ),
        'descricao': (
            "O endpoint retorna estatísticas de desempenho de qualquer aluno por userId. "
            "Professores ou Arquitetos de uma instituição podem consultar dados de alunos de "
            "outras instituições. Não há verificação de que o userId pertence ao tenant do "
            "chamador."
        ),
        'impacto': 'Exposição de dados de desempenho de alunos de outras instituições.',
        'correcao': (
            "Adicionar verificação: confirmar que o student.institutionId (ou student.instituicao) "
            "é igual ao do caller antes de retornar dados."
        ),
    },
    {
        'id': 'F7',
        'categoria': 'CAT-3 IDOR',
        'severidade': 'media',
        'titulo': 'GET /bounty/active expõe todos os bugs reports sem isolamento de tenant',
        'arquivo': 'backend/src/routes/bounty.ts:192-208',
        'trecho': (
            "const bugs = await prisma.bountyBug.findMany({\n"
            "  // sem filtro por instituição\n"
            "  orderBy: { createdAt: 'desc' }\n"
            "});"
        ),
        'descricao': (
            "O endpoint GET /bounty/active retorna todos os bug reports de todas as "
            "instituições para qualquer usuário autenticado. Inclui nome e matrícula do "
            "aluno que reportou o bug via o campo include.user."
        ),
        'impacto': 'Vazamento de PII (nome e matrícula) de alunos de todas as instituições.',
        'correcao': (
            "Filtrar por instituição do caller: where: { instituicao: request.user.instituicao }. "
            "Para ADMIN, manter a visão global sem filtro."
        ),
    },
    {
        'id': 'F8',
        'categoria': 'CAT-1 Isolamento de Tenant',
        'severidade': 'media',
        'titulo': 'GET /admin/matrix/audit aceita institutionId arbitrário via query param',
        'arquivo': 'backend/src/routes/admin.ts:1040-1058',
        'trecho': (
            "const { institutionId, instituicao: targetInstName, ... } = request.query;\n"
            "if (institutionId) {\n"
            "  targetInst = await prisma.institution.findUnique({ where: { id: institutionId } });\n"
            "}"
        ),
        'descricao': (
            "O endpoint /admin/matrix/audit aceita um institutionId via query string e usa "
            "esse ID sem verificar se ele é o mesmo da instituição do Arquiteto autenticado. "
            "Um ARQUITETO pode passar o UUID de qualquer outra instituição e visualizar toda "
            "a matriz de auditoria dela (quests, entregas, logs de ação)."
        ),
        'impacto': 'Cross-tenant data leak de métricas e logs de auditoria.',
        'correcao': (
            "Ignorar institutionId/instituicao da query para ARQUITETO e usar sempre "
            "request.user.institutionId. Apenas ADMIN deve poder filtrar por outra instituição."
        ),
    },
    {
        'id': 'F9',
        'categoria': 'CAT-2 Permissão Definida no Navegador',
        'severidade': 'media',
        'titulo': 'Endpoint PUT /quests/:id (editar quest) sem verificar posse do professor',
        'arquivo': 'backend/src/routes/quests.ts:549-572',
        'trecho': (
            "fastify.put('/:id', ..., async (request, reply) => {\n"
            "  if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN')\n"
            "    return 403;\n"
            "  // Quest atualizada SEM verificar se o professor criou ou tem vínculo com ela\n"
            "  const updated = await prisma.quest.update({ where: { id } ... });"
        ),
        'descricao': (
            "A rota PUT /quests/:id verifica apenas o papel (PROFESSOR/ADMIN), mas não "
            "verifica se o professor tem vínculo com a disciplina/turma da quest. Um professor "
            "de qualquer instituição pode editar o enunciado de qualquer quest de qualquer "
            "outra instituição se souber o UUID."
        ),
        'impacto': 'Sabotagem de quests de outras instituições; cross-tenant data tampering.',
        'correcao': (
            "Verificar se a quest pertence a uma turma cujo professor leciona: "
            "adicionar where: { turmaAlvo: { turmaDisciplinas: { some: { professorId } } } }."
        ),
    },
    {
        'id': 'F10',
        'categoria': 'CAT-2 Permissão Definida no Navegador',
        'severidade': 'media',
        'titulo': 'POST /quests/mock-boss sem verificar se professor pertence à turma',
        'arquivo': 'backend/src/routes/quests.ts:574-673',
        'trecho': (
            "fastify.post('/mock-boss', ..., async (request, reply) => {\n"
            "  // Verifica role PROFESSOR|ADMIN, mas:\n"
            "  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });\n"
            "  // Sem verificar se o professor está vinculado a essa turma"
        ),
        'descricao': (
            "O endpoint que cria um BOSS para uma turma verifica apenas se o usuário é "
            "PROFESSOR ou ADMIN, mas não verifica se o professor tem vínculo (TurmaDisciplina) "
            "com a turma especificada. Um professor pode invocar um BOSS em qualquer turma, "
            "inclusive de outras instituições."
        ),
        'impacto': 'Disruption de aulas: professor malicioso pode interromper aulas de outra turma/instituição.',
        'correcao': (
            "Adicionar verificação: confirmar que o professor possui um TurmaDisciplina ativo "
            "para o turmaId recebido."
        ),
    },
    {
        'id': 'F11',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'baixa',
        'titulo': 'Senha placeholder insegura armazenada em hash para alunos sem login',
        'arquivo': 'backend/src/routes/admin.ts:550,638,680',
        'trecho': (
            "password: 'INITIAL_SUMMONING_CODE_LOGIN'  // não é bcrypt hash!\n"
            "password: 'SUMMONING_CODE'\n"
            "password: 'RESET_TO_SUMMONING_CODE'"
        ),
        'descricao': (
            "Alunos criados via bulk ou individual recebem senhas em plaintext não-hasheadas "
            "no banco de dados. O login usa bcrypt.compare, então essas contas não conseguem "
            "fazer login diretamente, mas a senha em plaintext viola as políticas de "
            "armazenamento seguro e pode confundir sobre o estado da conta."
        ),
        'impacto': 'Baixo risco de exploração direta; violação de boas práticas de armazenamento.',
        'correcao': (
            "Usar await bcrypt.hash('SUMMONING_CODE', 10) mesmo para placeholders, "
            "ou marcar isFirstAccess=true sem definir senha."
        ),
    },
    {
        'id': 'F12',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'baixa',
        'titulo': 'CORS wildcard (*) habilitado no servidor',
        'arquivo': 'backend/src/server.ts:23-27',
        'trecho': "server.register(cors, { origin: '*', ... });",
        'descricao': (
            "O CORS está configurado com origin: '*', permitindo que qualquer domínio faça "
            "requisições cross-origin para a API. Em produção, isso abre a API para ser "
            "chamada de qualquer site malicioso, potencializando CSRF/phishing."
        ),
        'impacto': 'Informativo/baixo — JWT mitiga o risco principal, mas é má prática.',
        'correcao': (
            "Restringir origin a domínios específicos (app mobile não usa CORS, "
            "mas o frontend web usa). Definir lista allowlist de domínios."
        ),
    },
    {
        'id': 'F13',
        'categoria': 'CAT-4 Chaves Expostas',
        'severidade': 'baixa',
        'titulo': 'Token JWT passado como query parameter (?token=)',
        'arquivo': 'backend/src/plugins/auth.ts:13-15 / frontend/services/api.ts:322',
        'trecho': (
            "const queryToken = (request.query as any)?.token;\n"
            "if (queryToken && !request.headers.authorization) {\n"
            "  request.headers.authorization = `Bearer ${queryToken}`;\n"
            "}"
        ),
        'descricao': (
            "O plugin de auth suporta JWT via query parameter, e o frontend o usa para "
            "download de templates Excel. Tokens em URLs são armazenados em logs de servidor, "
            "histórico do browser e referrer headers, expondo-os desnecessariamente."
        ),
        'impacto': 'Vazamento de token em logs/referrer headers.',
        'correcao': (
            "Para downloads de arquivo autenticados, usar cookies httpOnly ou gerar URLs "
            "pré-assinadas de curta duração em vez de passar o token na URL."
        ),
    },
]

PONTOS_FORTES = [
    ("admin.ts — Isolamento de tenant em todas as rotas", "Todas as rotas de /admin aplicam globalmente authenticate + validateTenantStatus + validateInstitution via addHook. As queries filtram explicitamente por request.user.instituicao em todas as operações CRUD."),
    ("superadmin.ts — Role ADMIN verificado em todos os handlers", "Todos os endpoints de /superadmin verificam role === 'ADMIN' via addHook global, com fallback 401/403 correto."),
    ("professor.ts — Isolamento de dados do professor", "Todas as queries filtram por professorId do usuário autenticado via turmaDisciplinas.some."),
    ("bounty.ts — Verificação de posse nos endpoints críticos", "POST /:id/seen e POST /:id/response verificam bug.userId === request.user.id antes de permitir alterações."),
    ("quests.ts — POST /daily/submit verifica posse da entrega", "Verifica delivery.userId !== userId antes de processar, com caminho correto para Raid."),
    ("wrong-answers retry — Verificação de posse", "GET e POST de /wrong-answers/:id verificam wrongAnswer.userId !== userId antes de processar."),
    ("bcrypt em senhas de professores/arquitetos", "Senhas de professores e arquitetos são hasheadas com bcrypt (10 rounds) na criação e reset."),
    ("auth.ts — Middleware centralizado", "O plugin de autenticação é registrado globalmente e aplica jwtVerify() em todas as rotas protegidas."),
]

# ── Estatísticas ─────────────────────────────────────────────────────────────
SEV_COUNT = {'critica': 0, 'alta': 0, 'media': 0, 'baixa': 0}
CAT_COUNT = {}
for a in ACHADOS:
    SEV_COUNT[a['severidade']] += 1
    cat = a['categoria'].split(' ', 1)[1] if ' ' in a['categoria'] else a['categoria']
    CAT_COUNT[cat] = CAT_COUNT.get(cat, 0) + 1

# ── Gera gráficos ─────────────────────────────────────────────────────────────
def make_donut():
    labels = ['Crítica', 'Alta', 'Média', 'Baixa']
    sizes  = [SEV_COUNT['critica'], SEV_COUNT['alta'], SEV_COUNT['media'], SEV_COUNT['baixa']]
    clrs   = [COR['critica'], COR['alta'], COR['media'], COR['baixa']]
    fig, ax = plt.subplots(figsize=(4, 3.2))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, colors=clrs,
        autopct='%1.0f%%', startangle=90,
        wedgeprops={'width': 0.5, 'edgecolor': 'white', 'linewidth': 2},
        pctdistance=0.75
    )
    for at in autotexts:
        at.set_fontsize(9)
        at.set_color('white')
        at.set_fontweight('bold')
    ax.legend(labels, loc='lower center', bbox_to_anchor=(0.5, -0.18),
              ncol=2, fontsize=8, framealpha=0)
    ax.set_title('Achados por Severidade', fontsize=10, pad=8)
    ax.set_facecolor('none')
    fig.patch.set_alpha(0)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', transparent=True)
    plt.close(fig)
    buf.seek(0)
    return buf

def make_bar():
    cats  = list(CAT_COUNT.keys())
    vals  = [CAT_COUNT[c] for c in cats]
    short = [c.replace('Chaves Expostas', 'Chaves\nExpostas')
              .replace('Isolamento de Tenant', 'Isolamento\nTenant')
              .replace('Permissão Definida no Navegador', 'Permissão\nNavegador')
              .replace('Webhook sem Autenticação', 'Webhook\nAuth')
              for c in cats]
    fig, ax = plt.subplots(figsize=(5.5, 3.0))
    bar_colors = [COR['critica'], COR['media'], COR['alta'], COR['baixa'], COR['media']]
    bars = ax.bar(short, vals, color=bar_colors[:len(cats)], edgecolor='white', linewidth=0.8)
    for bar, v in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                str(v), ha='center', va='bottom', fontsize=9, fontweight='bold')
    ax.set_ylabel('Nº de Achados', fontsize=9)
    ax.set_title('Achados por Categoria', fontsize=10, pad=8)
    ax.set_ylim(0, max(vals) + 1)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.set_facecolor('none')
    fig.patch.set_alpha(0)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', transparent=True)
    plt.close(fig)
    buf.seek(0)
    return buf

# ── Document setup ────────────────────────────────────────────────────────────
OUTPUT = os.path.join(os.path.dirname(__file__), 'relatorio-auditoria-seguranca.pdf')
PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

styles = getSampleStyleSheet()

def S(name, **kwargs):
    base = styles.get(name, styles['Normal'])
    return ParagraphStyle(name + '_custom_' + '_'.join(f'{k}{v}' for k,v in kwargs.items()),
                          parent=base, **kwargs)

title_style  = S('Title', fontSize=22, textColor=hex_color(COR['accent']),
                 alignment=TA_CENTER, spaceAfter=6, fontName='Helvetica-Bold')
sub_style    = S('Normal', fontSize=11, textColor=hex_color(COR['muted']),
                 alignment=TA_CENTER, spaceAfter=4)
h1_style     = S('Heading1', fontSize=14, textColor=hex_color(COR['accent']),
                 fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4)
h2_style     = S('Heading2', fontSize=11, textColor=hex_color('#7DD3FC'),
                 fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=4)
body_style   = S('Normal', fontSize=9, leading=14, textColor=colors.black,
                 spaceAfter=4, alignment=TA_JUSTIFY)
code_style   = S('Normal', fontSize=8, fontName='Courier', leading=11,
                 textColor=hex_color(COR['critica']),
                 backColor=hex_color('#FFF1F2'), spaceAfter=4)
label_strong = S('Normal', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black)
green_style  = S('Normal', fontSize=9, textColor=hex_color(COR['forte']),
                 fontName='Helvetica-Bold')

SEV_COLORS = {
    'critica': COR['critica'],
    'alta':    COR['alta'],
    'media':   COR['media'],
    'baixa':   COR['baixa'],
}
SEV_LABELS = {
    'critica': 'CRÍTICA',
    'alta':    'ALTA',
    'media':   'MÉDIA',
    'baixa':   'BAIXA',
}

def sev_chip(sev):
    col = hex_color(SEV_COLORS[sev])
    return Paragraph(
        f'<font color="white"><b> {SEV_LABELS[sev]} </b></font>',
        ParagraphStyle('chip', parent=styles['Normal'], fontSize=8,
                       backColor=col, textColor=colors.white,
                       borderRadius=3, alignment=TA_CENTER)
    )

# ── Header / Footer ───────────────────────────────────────────────────────────
REPORT_TITLE = 'Auditoria de Segurança — Solen/Collegium'

def add_page_decorations(canvas, doc):
    canvas.saveState()
    # Header strip
    canvas.setFillColor(hex_color(COR['header_bg']))
    canvas.rect(0, PAGE_H - 1.1*cm, PAGE_W, 1.1*cm, fill=1, stroke=0)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(hex_color(COR['muted']))
    canvas.drawString(MARGIN, PAGE_H - 0.75*cm, REPORT_TITLE)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.75*cm,
                           datetime.date.today().strftime('%d/%m/%Y'))
    # Footer strip
    canvas.setFillColor(hex_color(COR['header_bg']))
    canvas.rect(0, 0, PAGE_W, 0.9*cm, fill=1, stroke=0)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(hex_color(COR['muted']))
    canvas.drawCentredString(PAGE_W/2, 0.4*cm,
                             f'Página {doc.page} — Confidencial')
    canvas.restoreState()

def build_doc():
    doc = BaseDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=1.4*cm, bottomMargin=1.4*cm,
        title=REPORT_TITLE,
        author='Auditoria Automatizada — solo-learning',
    )
    frame = Frame(MARGIN, 1.2*cm, PAGE_W - 2*MARGIN, PAGE_H - 2.6*cm, id='main')
    template = PageTemplate(id='main', frames=[frame],
                            onPage=add_page_decorations)
    doc.addPageTemplates([template])

    story = []

    # ── CAPA ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 2.5*cm))
    story.append(Paragraph('🔐 Relatório de Auditoria de Segurança', title_style))
    story.append(Paragraph('<b>Solo Learning — Solen / Collegium App</b>', sub_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width='100%', thickness=1, color=hex_color(COR['accent'])))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f'Data: {datetime.date.today().strftime("%d de %B de %Y")}', sub_style))
    story.append(Paragraph('Escopo: Código-fonte completo do repositório (backend + frontend)', sub_style))
    story.append(Spacer(1, 0.6*cm))

    nota = (
        "<b>Nota Metodológica:</b> A auditoria cobriu as cinco categorias padrão adaptadas à stack "
        "detectada: Node.js + Fastify + Prisma ORM + PostgreSQL (backend), Expo/React Native "
        "(frontend mobile). O mecanismo de isolamento de tenant é manual via filtro por "
        "<i>request.user.instituicao</i> / <i>institutionId</i> nas queries Prisma — não há RLS no banco. "
        "Todos os achados foram verificados no código-fonte real. "
        "Nenhuma especulação foi incluída."
    )
    story.append(Paragraph(nota, body_style))
    story.append(PageBreak())

    # ── RESUMO EXECUTIVO ───────────────────────────────────────────────────────
    story.append(Paragraph('1. Resumo Executivo', h1_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['accent'])))
    story.append(Spacer(1, 0.3*cm))

    total = sum(SEV_COUNT.values())
    summ_data = [
        ['Severidade', 'Qtd'],
        ['Crítica', str(SEV_COUNT['critica'])],
        ['Alta',    str(SEV_COUNT['alta'])],
        ['Média',   str(SEV_COUNT['media'])],
        ['Baixa',   str(SEV_COUNT['baixa'])],
        ['TOTAL',   str(total)],
    ]
    sev_table_style = TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), hex_color(COR['header_bg'])),
        ('TEXTCOLOR',    (0,0), (-1,0), colors.white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [hex_color(COR['row_even']), hex_color(COR['row_odd'])]),
        ('BACKGROUND',   (0,1), (0,1), hex_color(COR['critica'])),
        ('TEXTCOLOR',    (0,1), (0,1), colors.white),
        ('BACKGROUND',   (0,2), (0,2), hex_color(COR['alta'])),
        ('TEXTCOLOR',    (0,2), (0,2), colors.white),
        ('BACKGROUND',   (0,3), (0,3), hex_color(COR['media'])),
        ('TEXTCOLOR',    (0,3), (0,3), colors.white),
        ('BACKGROUND',   (0,4), (0,4), hex_color(COR['baixa'])),
        ('TEXTCOLOR',    (0,4), (0,4), colors.white),
        ('BACKGROUND',   (0,5), (-1,5), hex_color('#334155')),
        ('TEXTCOLOR',    (0,5), (-1,5), colors.white),
        ('FONTNAME',     (0,5), (-1,5), 'Helvetica-Bold'),
        ('ALIGN',        (1,0), (1,-1), 'CENTER'),
        ('GRID',         (0,0), (-1,-1), 0.5, colors.white),
        ('ROUNDEDCORNERS', [4]),
    ])

    donut_buf = make_donut()
    bar_buf   = make_bar()

    graphs_table = Table(
        [[Image(donut_buf, width=7*cm, height=5.5*cm),
          Image(bar_buf,   width=9*cm, height=5.5*cm)]],
        colWidths=[7.5*cm, 9.5*cm]
    )
    graphs_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))

    t = Table(summ_data, colWidths=[5*cm, 2*cm])
    t.setStyle(sev_table_style)

    combo = Table([[t, graphs_table]], colWidths=[7.5*cm, 9.5*cm])
    combo.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(combo)
    story.append(Spacer(1, 0.5*cm))

    # ── PONTOS FORTES ──────────────────────────────────────────────────────────
    story.append(Paragraph('2. Pontos Fortes (Controles Verificados)', h1_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['forte'])))
    story.append(Spacer(1, 0.2*cm))

    for titulo, desc in PONTOS_FORTES:
        story.append(Paragraph(f'✅ {titulo}', green_style))
        story.append(Paragraph(desc, body_style))

    story.append(PageBreak())

    # ── ACHADOS DETALHADOS ────────────────────────────────────────────────────
    story.append(Paragraph('3. Achados Detalhados', h1_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['accent'])))
    story.append(Spacer(1, 0.3*cm))

    for a in ACHADOS:
        sev = a['severidade']
        strip_color = hex_color(SEV_COLORS[sev])

        block = []
        header_row = Table(
            [[sev_chip(sev),
              Paragraph(f"<b>[{a['id']}] {a['titulo']}</b>",
                        ParagraphStyle('fh', parent=styles['Normal'], fontSize=9.5,
                                       fontName='Helvetica-Bold', textColor=colors.black))]],
            colWidths=[1.8*cm, 14.2*cm]
        )
        header_row.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), hex_color('#F8FAFC')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
        ]))
        block.append(header_row)

        block.append(Paragraph(f'<b>Categoria:</b> {a["categoria"]}', body_style))
        block.append(Paragraph(f'<b>Arquivo:linha</b> — <font name="Courier" size="8">{a["arquivo"]}</font>', body_style))
        block.append(Paragraph('<b>Trecho:</b>', label_strong))
        for line in a['trecho'].split('\n'):
            block.append(Paragraph(line, code_style))
        block.append(Paragraph(f'<b>Descrição:</b> {a["descricao"]}', body_style))
        block.append(Paragraph(f'<b>Impacto:</b> {a["impacto"]}', body_style))
        block.append(Paragraph(f'<b>Correção sugerida:</b> {a["correcao"]}', body_style))
        block.append(Spacer(1, 0.2*cm))
        block.append(HRFlowable(width='100%', thickness=0.3, color=hex_color(COR['muted'])))
        block.append(Spacer(1, 0.3*cm))

        story.append(KeepTogether(block))

    story.append(PageBreak())

    # ── RECOMENDAÇÕES ─────────────────────────────────────────────────────────
    story.append(Paragraph('4. Recomendações Priorizadas', h1_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['accent'])))
    story.append(Spacer(1, 0.2*cm))

    recs = [
        ('P1 — Imediato',   COR['critica'], [
            'F2: Revogar todas as credenciais do .env commitado (Gemini, Nvidia, Gmail, DB, JWT). Adicionar ao .gitignore. Expurgar do histórico git.',
            'F1: Remover fallback do JWT_SECRET. Adicionar validação de startup.',
            'F5: Implementar verificação de assinatura HMAC no webhook de billing.',
        ]),
        ('P2 — Curto Prazo', COR['alta'], [
            'F3: Gerar senha aleatória forte para Arquitetos. Remover "Solen2026" da UI e do código.',
            'F4: Parametrizar credenciais do docker-compose via variáveis de ambiente.',
            'F9: Verificar posse do professor ao editar quests.',
            'F10: Verificar vínculo professor-turma no endpoint mock-boss.',
        ]),
        ('P3 — Médio Prazo', COR['media'], [
            'F6: Verificar tenant do aluno em /subject-stats/:userId.',
            'F7: Filtrar bug reports por instituição do caller em /bounty/active.',
            'F8: Restringir institutionId da query de audit à instituição do Arquiteto.',
        ]),
        ('P4 — Melhorias',   COR['baixa'], [
            'F11: Hashar senhas placeholder de alunos.',
            'F12: Restringir CORS origin para lista de domínios permitidos.',
            'F13: Substituir JWT em query param por URLs pré-assinadas de curta duração.',
        ]),
    ]

    for label, color, items in recs:
        story.append(Paragraph(f'<b>{label}</b>',
                               ParagraphStyle('rec', parent=styles['Normal'], fontSize=10,
                                              textColor=hex_color(color), fontName='Helvetica-Bold',
                                              spaceBefore=6)))
        for item in items:
            story.append(Paragraph(f'• {item}', body_style))
        story.append(Spacer(1, 0.2*cm))

    story.append(PageBreak())

    # ── ISSUES PARA O GITHUB ──────────────────────────────────────────────────
    story.append(Paragraph('5. Issues para o GitHub', h1_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['accent'])))
    story.append(Spacer(1, 0.3*cm))

    issues = [
        {
            'n': 1,
            'achados': ['F1', 'F2'],
            'titulo': '[Segurança] JWT_SECRET hardcoded e credenciais reais no repositório',
            'labels': 'security, severity:critical',
            'desc': (
                "## Descrição\n\n"
                "Duas falhas críticas relacionadas à gestão de segredos foram identificadas:\n\n"
                "**1. JWT_SECRET com fallback hardcoded (`auth.ts:8`)**\n"
                "O plugin de autenticação usa `'supersecret_solen_key_123'` como fallback "
                "quando `JWT_SECRET` não está definido. Qualquer pessoa com acesso ao repositório "
                "pode forjar tokens JWT válidos para qualquer usuário, incluindo ADMIN.\n\n"
                "**2. Credenciais reais commitadas no `.env` (`backend/.env`)**\n"
                "O arquivo `.env` com `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, "
                "`NVIDIA_API_KEY` e `SMTP_PASS` está rastreado pelo git. Mesmo após o commit "
                "'Remove chave no .env' (25b0923), o arquivo existe na árvore de trabalho e "
                "versões antigas estão no histórico."
            ),
            'evidencia': (
                "- `backend/src/plugins/auth.ts:8`: `secret: process.env.JWT_SECRET || 'supersecret_solen_key_123'`\n"
                "- `backend/.env:1-11`: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, NVIDIA_API_KEY, SMTP_PASS"
            ),
            'impacto': (
                "- Forja de tokens JWT → escalada de privilégio total\n"
                "- Acesso ao banco de dados de produção\n"
                "- Uso indevido das cotas de API (Gemini/Nvidia)\n"
                "- Acesso à caixa de e-mail institucional"
            ),
            'correcao': (
                "1. **IMEDIATO**: Revogar todas as credenciais expostas (rotacionar DB password, "
                "JWT_SECRET, API keys, app password Gmail)\n"
                "2. Adicionar `backend/.env` ao `.gitignore`\n"
                "3. Usar `git-filter-repo` para expurgar o `.env` do histórico\n"
                "4. Remover o fallback do JWT_SECRET em `auth.ts:8`\n"
                "5. Adicionar validação de startup que rejeite JWT_SECRET ausente ou igual ao padrão conhecido"
            ),
            'criterios': (
                "- [ ] Todas as credenciais rotacionadas e confirmadas inválidas\n"
                "- [ ] `backend/.env` adicionado ao `.gitignore` e não aparece em `git status`\n"
                "- [ ] `auth.ts:8` sem fallback literal; servidor falha ao iniciar sem JWT_SECRET válido\n"
                "- [ ] `git log --all -- backend/.env` retorna apenas commits de remoção"
            ),
        },
        {
            'n': 2,
            'achados': ['F3', 'F4'],
            'titulo': '[Segurança] Senha padrão "Solen2026" hardcoded e credenciais do Docker expostas',
            'labels': 'security, severity:high',
            'desc': (
                "## Descrição\n\n"
                "**1. Senha padrão de Arquiteto (`superadmin.ts:99`)**\n"
                "A senha 'Solen2026' está hardcoded na criação e reset de Arquitetos, e também "
                "exibida na UI do superadmin (`dashboard.tsx:377,716,1179`). Qualquer Arquiteto "
                "que não trocou a senha pode ser comprometido.\n\n"
                "**2. Credenciais PostgreSQL no docker-compose.yml (`docker-compose.yml:6-8`)**\n"
                "As credenciais do banco (user/password/db) estão hardcoded com valores previsíveis "
                "que coincidem com os do DATABASE_URL."
            ),
            'evidencia': (
                "- `backend/src/routes/superadmin.ts:99`: `const rawPassword = password || 'Solen2026';`\n"
                "- `backend/docker-compose.yml:6-8`: `POSTGRES_PASSWORD: solen_password`"
            ),
            'impacto': (
                "- Comprometimento de todas as contas de Arquiteto não alteradas\n"
                "- Acesso direto ao banco de dados se o container for exposto"
            ),
            'correcao': (
                "1. Gerar senhas aleatórias fortes (ex: `crypto.randomBytes(16).toString('hex')`) "
                "na criação/reset de arquitetos\n"
                "2. Remover 'Solen2026' da UI — comunicar a senha por canal seguro\n"
                "3. Usar variáveis de ambiente sem defaults no docker-compose: `${POSTGRES_PASSWORD:?}`"
            ),
            'criterios': (
                "- [ ] `superadmin.ts` não contém strings literais de senha\n"
                "- [ ] `dashboard.tsx` não exibe a senha padrão na UI\n"
                "- [ ] `docker-compose.yml` usa `${POSTGRES_PASSWORD}` sem valor default\n"
                "- [ ] Arquitetos com `isFirstAccess=true` recebem senha gerada aleatoriamente"
            ),
        },
        {
            'n': 3,
            'achados': ['F5'],
            'titulo': '[Segurança] Webhook de billing sem verificação de assinatura HMAC',
            'labels': 'security, severity:high',
            'desc': (
                "## Descrição\n\n"
                "O endpoint `POST /webhooks/billing/webhook` não valida a assinatura do payload "
                "recebido. Qualquer ator pode enviar um POST forjado com `type: 'invoice.paid'` "
                "e um `institutionId` arbitrário para ativar gratuitamente qualquer conta "
                "bloqueada ou inadimplente. O inverso também é possível: cancelar contas pagantes."
            ),
            'evidencia': (
                "- `backend/src/routes/webhooks.ts:6-43`: sem validação de assinatura"
            ),
            'impacto': (
                "- Fraude: ativação gratuita de contas\n"
                "- DoS: bloqueio de contas pagantes"
            ),
            'correcao': (
                "Implementar verificação de assinatura HMAC-SHA256 usando o segredo de webhook "
                "do gateway (ex: Stripe: `stripe.webhooks.constructEvent(body, sig, secret)`, "
                "Asaas: verificar header `asaas-access-token`)"
            ),
            'criterios': (
                "- [ ] Webhook rejeita payloads sem assinatura válida com HTTP 400\n"
                "- [ ] Segredo de webhook armazenado em variável de ambiente\n"
                "- [ ] Teste de rejeição de payload forjado documentado"
            ),
        },
        {
            'n': 4,
            'achados': ['F6', 'F7', 'F8'],
            'titulo': '[Segurança] IDOR e cross-tenant em endpoints de dados de alunos e audit',
            'labels': 'security, severity:medium',
            'desc': (
                "## Descrição\n\n"
                "Três endpoints expõem dados de outros tenants:\n\n"
                "**F6 — GET /quests/subject-stats/:userId (`quests.ts:2800`)**\n"
                "Retorna desempenho de qualquer aluno sem verificar se pertence à instituição do caller.\n\n"
                "**F7 — GET /bounty/active (`bounty.ts:192`)**\n"
                "Retorna todos os bug reports (incluindo nome e matrícula) de todas as instituições.\n\n"
                "**F8 — GET /admin/matrix/audit (`admin.ts:1040`)**\n"
                "Aceita `institutionId` via query param sem verificar se pertence ao caller."
            ),
            'evidencia': (
                "- `quests.ts:2800`: sem verificação de tenant do student\n"
                "- `bounty.ts:192`: `prisma.bountyBug.findMany({})` sem filtro\n"
                "- `admin.ts:1040-1058`: aceita institutionId arbitrário"
            ),
            'impacto': (
                "- Vazamento de PII de alunos (nome, matrícula)\n"
                "- Cross-tenant data leak de métricas pedagógicas e logs de auditoria"
            ),
            'correcao': (
                "F6: Verificar `student.institutionId === request.user.institutionId`\n"
                "F7: Adicionar `where: { instituicao: request.user.instituicao }` (exceto ADMIN)\n"
                "F8: Ignorar `institutionId` da query para ARQUITETO; usar `request.user.institutionId`"
            ),
            'criterios': (
                "- [ ] `/subject-stats/:userId` retorna 403 para aluno de outra instituição\n"
                "- [ ] `/bounty/active` retorna apenas bugs da instituição do caller\n"
                "- [ ] `/admin/matrix/audit` ignora institutionId arbitrário para ARQUITETO\n"
                "- [ ] Testes automatizados cobrindo os três cenários"
            ),
        },
        {
            'n': 5,
            'achados': ['F9', 'F10'],
            'titulo': '[Segurança] Falta de verificação de posse em edição de quests e invocação de boss',
            'labels': 'security, severity:medium',
            'desc': (
                "## Descrição\n\n"
                "**F9 — PUT /quests/:id (`quests.ts:549`)**\n"
                "Professor pode editar o enunciado de qualquer quest sem verificar vínculo com a turma.\n\n"
                "**F10 — POST /quests/mock-boss (`quests.ts:574`)**\n"
                "Professor pode invocar um BOSS em qualquer turma (inclusive de outras instituições) "
                "sem verificar TurmaDisciplina."
            ),
            'evidencia': (
                "- `quests.ts:549-572`: `prisma.quest.update({ where: { id } })` sem verificação de posse\n"
                "- `quests.ts:574-673`: `prisma.turma.findUnique({ where: { id: turmaId } })` sem verificação de vínculo"
            ),
            'impacto': (
                "- Sabotagem de quests de outras instituições\n"
                "- Disrupção de aulas: BOSS invocado em turmas não gerenciadas pelo professor"
            ),
            'correcao': (
                "F9: `prisma.quest.update({ where: { id, turmaAlvo: { turmaDisciplinas: { some: { professorId } } } } })`\n"
                "F10: Verificar `prisma.turmaDisciplina.findFirst({ where: { turmaId, professorId } })` antes de prosseguir"
            ),
            'criterios': (
                "- [ ] Professor não consegue editar quest de turma sem vínculo\n"
                "- [ ] Professor não consegue invocar boss em turma sem vínculo\n"
                "- [ ] Ambos retornam 403 em caso de acesso indevido"
            ),
        },
        {
            'n': 6,
            'achados': ['F11', 'F12', 'F13'],
            'titulo': '[Segurança] Melhorias de boas práticas: senhas placeholder, CORS e JWT em URL',
            'labels': 'security, severity:low',
            'desc': (
                "## Descrição\n\n"
                "**F11 — Senhas placeholder em plaintext (`admin.ts:550,638,680`)**\n"
                "Alunos criados via bulk recebem strings plaintext como senha no banco.\n\n"
                "**F12 — CORS wildcard (`server.ts:24`)**\n"
                "CORS aberto para qualquer origem (`origin: '*'`).\n\n"
                "**F13 — JWT em query parameter (`auth.ts:13-15`, `api.ts:322`)**\n"
                "Token JWT exposto em URLs de download, logs e referrer headers."
            ),
            'evidencia': (
                "- `admin.ts:550`: `password: 'INITIAL_SUMMONING_CODE_LOGIN'`\n"
                "- `server.ts:24`: `origin: '*'`\n"
                "- `api.ts:322`: `?token=${encodeURIComponent(token)}`"
            ),
            'impacto': "Violação de boas práticas; risco baixo mas acumulado.",
            'correcao': (
                "F11: Usar `bcrypt.hash('SUMMONING_CODE', 10)` para senhas placeholder\n"
                "F12: Definir lista de domínios permitidos no CORS\n"
                "F13: Gerar URL temporária pré-assinada via endpoint separado para downloads"
            ),
            'criterios': (
                "- [ ] Senhas de alunos armazenadas como hash bcrypt\n"
                "- [ ] CORS restrito a domínios da lista allowlist\n"
                "- [ ] Downloads de template não expõem JWT na URL"
            ),
        },
    ]

    for issue in issues:
        story.append(Paragraph(f'--- ISSUE {issue["n"]} ---', h2_style))
        story.append(Paragraph(f'<b>Título:</b> {issue["titulo"]}', body_style))
        story.append(Paragraph(f'<b>Labels:</b> {issue["labels"]}', body_style))
        story.append(Paragraph(f'<b>Achados cobertos:</b> {", ".join(issue["achados"])}', body_style))
        story.append(Spacer(1, 0.15*cm))

        for section, content in [
            ('Descrição', issue['desc']),
            ('Evidência', issue['evidencia']),
            ('Impacto', issue['impacto']),
            ('Sugestão de Correção', issue['correcao']),
            ('Critérios de Aceite', issue['criterios']),
        ]:
            story.append(Paragraph(f'<b>{section}:</b>', label_strong))
            for line in content.strip().split('\n'):
                line = line.strip()
                if line.startswith('## '):
                    story.append(Paragraph(line[3:], h2_style))
                elif line.startswith('**') and line.endswith('**'):
                    story.append(Paragraph(line[2:-2], ParagraphStyle('bold', parent=styles['Normal'],
                                                                        fontSize=9, fontName='Helvetica-Bold')))
                elif line:
                    story.append(Paragraph(line, body_style))

        story.append(Paragraph(f'--- FIM ISSUE {issue["n"]} ---', h2_style))
        story.append(Spacer(1, 0.4*cm))
        story.append(HRFlowable(width='100%', thickness=0.5, color=hex_color(COR['muted'])))
        story.append(Spacer(1, 0.3*cm))

    doc.build(story)
    print(f'✅ PDF gerado: {OUTPUT}')
    return OUTPUT

if __name__ == '__main__':
    build_doc()
