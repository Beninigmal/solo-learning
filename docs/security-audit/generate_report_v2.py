#!/usr/bin/env python3
"""
Relatório de Auditoria de Segurança v2 — Collegium (Solo Learning)
Re-auditoria após correções.
"""
import os, sys, html as html_mod
from datetime import datetime

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib import colors

# ── Colors ──
C_CRITICA   = HexColor('#B91C1C')
C_ALTA      = HexColor('#EA580C')
C_MEDIA     = HexColor('#D97706')
C_BAIXA     = HexColor('#2563EB')
C_FORTE     = HexColor('#059669')
C_FIXED     = HexColor('#16A34A')
C_HEADER_BG = HexColor('#1E293B')
C_ROW_ALT   = HexColor('#F1F5F9')

styles = getSampleStyleSheet()
def make_style(name, **kw):
    base = kw.pop('parent', styles['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

sTitle    = make_style('STitle2',    fontSize=26, leading=32, textColor=C_HEADER_BG, alignment=TA_CENTER, spaceAfter=4*mm, fontName='Helvetica-Bold')
sH1       = make_style('SH1v2',      fontSize=18, leading=22, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=8*mm, spaceAfter=4*mm)
sH2       = make_style('SH2v2',      fontSize=14, leading=18, textColor=HexColor('#334155'), fontName='Helvetica-Bold', spaceBefore=5*mm, spaceAfter=3*mm)
sBody     = make_style('SBodyv2',    fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), alignment=TA_JUSTIFY, spaceAfter=2*mm)
sBodySm   = make_style('SBodySmv2',  fontSize=8.5, leading=11, textColor=HexColor('#334155'))
sIssue    = make_style('SIssuev2',   fontSize=8.5, leading=12, textColor=HexColor('#1E293B'), fontName='Courier', backColor=HexColor('#F8FAFC'), borderPadding=4, spaceBefore=2*mm, spaceAfter=2*mm)

# ── NEW findings (still open) ──
open_findings = [
    ('IDOR-001', 'ALTA', 'IDOR',
     'backend/src/routes/admin.ts', '441-460',
     'Reatribuição de aluno a outra instituição sem verificar posse',
     'Ao cadastrar um aluno via POST /admin/stomes, se a matrícula já existe, o código atualiza turmaId, turno, instituicao e institutionId SEM verificar se o aluno pertence à mesma instituição do Arquiteto.',
     'if (existingStudent) {\n  const updatedStudent = await prisma.user.update({\n    where: { id: existingStudent.id },\n    data: {\n      turmaId,\n      turno,\n      instituicao: request.user.instituicao,\n      institutionId: request.user.institutionId || null\n    }\n  });\n  // ⚠️ Sem verificação de posse!'),
    ('IDOR-002', 'ALTA', 'IDOR',
     'backend/src/routes/admin.ts', '560-592',
     'Cadastro em lote não verifica instituição de matrículas existentes',
     'O cadastro em lote POST /admin/stomes/batch não verifica se alunos com matrículas existentes pertencem à instituição do Arquiteto.',
     'for (const s of students) {\n  await prisma.user.create({\n    data: {\n      matricula: s.matricula.toLowerCase().trim(),\n      // ⚠️ Sem verificação de instituição para matrículas existentes\n    }\n  });\n}'),
    ('ISOLATION-002', 'MÉDIA', 'ISOLAMENTO',
     'backend/src/routes/professor.ts', '69-80',
     'Alunos não atribuídos listados globalmente para Professores',
     'Quando um Professor consulta GET /professor/stomes?unassigned=true, a query retorna TODOS os alunos sem turma, sem filtro de instituição.',
     'if (unassigned === \'true\') {\n  where.turmaId = null;\n  // ⚠️ Sem filtro de turmaDisciplinas ou instituição\n}'),
    ('XSS-001', 'ALTA', 'XSS/INJEÇÃO',
     'backend/src/routes/bounty.ts', '55',
     'Input do usuário injetado em HTML de e-mail sem sanitização',
     'A descrição do bug report é injetada diretamente no template HTML do e-mail com apenas replace de \\n por <br/>, sem escape de HTML.',
     'html: `\n  <blockquote>\n    ${description.replace(/\\n/g, \'<br/>\')}\n  </blockquote>\n`\n// ⚠️ Sem escape HTML'),
    ('AUTH-002', 'MÉDIA', 'AUTENTICAÇÃO',
     'backend/src/plugins/auth.ts', '12-15',
     'Token JWT aceito via query string (?token=...)',
     'O plugin de autenticação aceita tokens na query string além do header Authorization. Tokens em URLs ficam em logs e histórico.',
     'const queryToken = (request.query as any)?.token;\nif (queryToken && !request.headers.authorization) {\n  request.headers.authorization = `Bearer ${queryToken}`;\n}'),
    ('CONFIG-001', 'BAIXA', 'CONFIGURAÇÃO',
     'backend/src/routes/admin.ts', '84',
     'Senha padrão \'1234\' para professores (fraca)',
     'A senha padrão para novos professores continua sendo \'1234\'. Embora agora hasheada com bcrypt, é trivialmente adivinhável na janela antes do primeiro acesso.',
     'const defaultPassword = await bcrypt.hash(\'1234\', 10);'),
    ('CONFIG-002', 'BAIXA', 'CONFIGURAÇÃO',
     'backend/src/routes/admin.ts', '134',
     'Código de invocação padrão \'1234\' para turmas',
     'O código de invocação padrão para novas turmas continua sendo \'1234\'.',
     'codigoInvocacao: codigoInvocacao ? codigoInvocacao.trim() : "1234"'),
]

# ── FIXED findings (resolved) ──
fixed_findings = [
    ('CRED-001', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/src/plugins/auth.ts', '6-8',
     'Segredo JWT hardcoded como fallback → REMOVIDO',
     'ANTES: fallback hardcoded \'supersecret_solen_key_123\'. AGORA: validação no startup que aborta se JWT_SECRET não estiver definido.',
     '// ANTES:\nsecret: process.env.JWT_SECRET || \'supersecret_solen_key_123\'\n\n// DEPOIS:\nconst jwtSecret = process.env.JWT_SECRET;\nif (!jwtSecret) {\n  throw new Error(\'FATAL: JWT_SECRET not defined\');\n}\nfastify.register(fastifyJwt, { secret: jwtSecret });'),
    ('CRED-003', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/docker-compose.yml', '5-7',
     'Credenciais PostgreSQL hardcoded → Agora usa variáveis de ambiente',
     'ANTES: valores inline. AGORA: usa ${POSTGRES_USER:-default}. Melhor, mas defaults ainda fracos.',
     '# ANTES:\nPOSTGRES_USER: solen_user\n\n# DEPOIS:\nPOSTGRES_USER: ${POSTGRES_USER:-solen_user}'),
    ('CRED-004', 'CRÍTICA', 'CHAVES EXPOSTAS',
     'backend/src/routes/admin.ts', '452,504,549',
     'Senhas de alunos em texto plano → Agora hasheadas com bcrypt',
     'Todos os 3 pontos (create, batch, reset) agora usam bcrypt.hash() antes de persistir.',
     '// ANTES:\npassword: \'INITIAL_SUMMONING_CODE_LOGIN\'\n\n// DEPOIS:\nconst initialPasswordHash = await bcrypt.hash(\'SUMMONING_CODE\', 10);\npassword: initialPasswordHash'),
    ('CRED-005', 'ALTA', 'CHAVES EXPOSTAS',
     'backend/src/routes/superadmin.ts', '60,163',
     'Senha padrão hardcoded \'Solen2026\' → Agora gera senha aleatória',
     'ANTES: fallback \'Solen2026\'. AGORA: gera senha aleatória via crypto.randomBytes e retorna temporaryPassword ao admin.',
     '// ANTES:\nconst rawPassword = password || \'Solen2026\';\n\n// DEPOIS:\nconst rawPassword = password || `Solen#${crypto.randomBytes(4).toString(\'hex\')}`;\n// Retorna temporaryPassword no response'),
    ('AUTH-001', 'CRÍTICA', 'PERMISSÃO',
     'backend/src/routes/webhooks.ts', '1-20',
     'Webhook SEM autenticação → Agora valida WEBHOOK_SECRET',
     'ANTES: zero autenticação. AGORA: valida header x-webhook-secret (ou asaas-access-token, stripe-signature) contra WEBHOOK_SECRET.',
     'const webhookSecret = process.env.WEBHOOK_SECRET;\nconst incomingSecret = request.headers[\'x-webhook-secret\'];\nif (webhookSecret && incomingSecret !== webhookSecret) {\n  return reply.status(401).send({ error: \'Não autorizado\' });\n}'),
    ('IDOR-003', 'ALTA', 'IDOR',
     'backend/src/routes/admin.ts', 'matrix/audit',
     'Matriz de auditoria cross-tenant → Agora restringe a ADMIN',
     'ANTES: institutionId/instituicao aceitos de qualquer usuário. AGORA: só ADMIN pode usar esses parâmetros.',
     'const isSuperAdmin = request.user.role === \'ADMIN\';\nif (isSuperAdmin && institutionId) {\n  targetInst = await prisma.institution.findUnique(...);\n} else if (request.user.institutionId) {\n  targetInst = await prisma.institution.findUnique(...);\n}'),
    ('ISOLATION-001', 'ALTA', 'ISOLAMENTO',
     'backend/src/routes/bounty.ts', '123-135',
     'GET /bounty/active sem filtro → Agora filtra por instituição',
     'ANTES: retorna bugs de todas instituições. AGORA: filtra por instituicao para não-ADMIN.',
     'where: request.user.role === \'ADMIN\'\n  ? {}\n  : (userInst ? { instituicao: userInst } : {})'),
    ('CORS-001', 'MÉDIA', 'CONFIGURAÇÃO',
     'backend/src/server.ts', '14-17',
     'CORS origin \'*\' → Agora usa CORS_ORIGIN env var',
     'ANTES: hardcoded \'*\'. AGORA: lê CORS_ORIGIN de variável de ambiente, fallback para \'*\' se não definido.',
     'const allowedOrigins = process.env.CORS_ORIGIN\n  ? process.env.CORS_ORIGIN.split(\',\').map(o => o.trim())\n  : \'*\';\nserver.register(cors, { origin: allowedOrigins });'),
]

# Counts
sev_open = {'CRÍTICA': 0, 'ALTA': 0, 'MÉDIA': 0, 'BAIXA': 0}
sev_fixed = {'CRÍTICA': 0, 'ALTA': 0, 'MÉDIA': 0, 'BAIXA': 0}
cat_open = {}
cat_fixed = {}
for f in open_findings:
    sev_open[f[1]] += 1
    cat_open[f[2]] = cat_open.get(f[2], 0) + 1
for f in fixed_findings:
    sev_fixed[f[1]] += 1
    cat_fixed[f[2]] = cat_fixed.get(f[2], 0) + 1

total_open = sum(sev_open.values())
total_fixed = sum(sev_fixed.values())
total_all = total_open + total_fixed

# ── Generate charts ──
chart_dir = '/tmp/security_charts_v2'
os.makedirs(chart_dir, exist_ok=True)

# Comparison bar
fig1, ax1 = plt.subplots(figsize=(5, 3.5), dpi=150)
cats = list(set(list(cat_open.keys()) + list(cat_fixed.keys())))
cats.sort()
x = range(len(cats))
w = 0.35
open_vals = [cat_open.get(c, 0) for c in cats]
fixed_vals = [cat_fixed.get(c, 0) for c in cats]
bars1 = ax1.bar([i - w/2 for i in x], open_vals, w, label='Abertos', color='#EA580C', edgecolor='white')
bars2 = ax1.bar([i + w/2 for i in x], fixed_vals, w, label='Corrigidos', color='#16A34A', edgecolor='white')
for b in bars1:
    if b.get_height() > 0:
        ax1.text(b.get_x() + b.get_width()/2, b.get_height() + 0.1, str(int(b.get_height())), ha='center', fontsize=9, fontweight='bold', color='#EA580C')
for b in bars2:
    if b.get_height() > 0:
        ax1.text(b.get_x() + b.get_width()/2, b.get_height() + 0.1, str(int(b.get_height())), ha='center', fontsize=9, fontweight='bold', color='#16A34A')
ax1.set_xticks(list(x))
ax1.set_xticklabels(cats, fontsize=8, rotation=15, ha='right')
ax1.set_ylabel('Achados', fontsize=9)
ax1.set_title('Achados Abertos vs. Corrigidos por Categoria', fontsize=11, fontweight='bold', pad=10, color='#1E293B')
ax1.legend(fontsize=8)
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)
ax1.set_ylim(0, max(max(open_vals), max(fixed_vals)) + 2)
plt.tight_layout()
fig1.savefig(f'{chart_dir}/comparison.png', bbox_inches='tight', facecolor='white')
plt.close()

# Severity pie for remaining
fig2, (ax2a, ax2b) = plt.subplots(1, 2, figsize=(7, 3.5), dpi=150)
# Left: remaining
labels_o = [k for k, v in sev_open.items() if v > 0]
sizes_o = [v for v in sev_open.values() if v > 0]
colors_o = ['#B91C1C' if k == 'CRÍTICA' else '#EA580C' if k == 'ALTA' else '#D97706' if k == 'MÉDIA' else '#2563EB' for k in labels_o]
if sizes_o:
    wedges1, _, autotexts1 = ax2a.pie(sizes_o, labels=labels_o, colors=colors_o, autopct='%1.0f%%', startangle=90, pctdistance=0.75, textprops={'fontsize': 8, 'fontweight': 'bold'})
    for t in autotexts1: t.set_color('white'); t.set_fontsize(8)
    centre1 = plt.Circle((0, 0), 0.55, fc='white'); ax2a.add_artist(centre1)
    ax2a.text(0, 0.06, str(sum(sizes_o)), ha='center', va='center', fontsize=18, fontweight='bold', color='#1E293B')
    ax2a.text(0, -0.12, 'abertos', ha='center', va='center', fontsize=8, color='#64748B')
ax2a.set_title('Achados Restantes', fontsize=10, fontweight='bold', color='#1E293B')

# Right: fixed
labels_f = [k for k, v in sev_fixed.items() if v > 0]
sizes_f = [v for v in sev_fixed.values() if v > 0]
colors_f = ['#B91C1C' if k == 'CRÍTICA' else '#EA580C' if k == 'ALTA' else '#D97706' if k == 'MÉDIA' else '#2563EB' for k in labels_f]
if sizes_f:
    wedges2, _, autotexts2 = ax2b.pie(sizes_f, labels=labels_f, colors=colors_f, autopct='%1.0f%%', startangle=90, pctdistance=0.75, textprops={'fontsize': 8, 'fontweight': 'bold'})
    for t in autotexts2: t.set_color('white'); t.set_fontsize(8)
    centre2 = plt.Circle((0, 0), 0.55, fc='white'); ax2b.add_artist(centre2)
    ax2b.text(0, 0.06, str(sum(sizes_f)), ha='center', va='center', fontsize=18, fontweight='bold', color='#1E293B')
    ax2b.text(0, -0.12, 'corrigidos', ha='center', va='center', fontsize=8, color='#64748B')
ax2b.set_title('Achados Corrigidos', fontsize=10, fontweight='bold', color='#1E293B')
plt.tight_layout()
fig2.savefig(f'{chart_dir}/severity_comparison.png', bbox_inches='tight', facecolor='white')
plt.close()

# ── PDF Document ──
output_path = 'docs/security-audit/relatorio-auditoria-seguranca-v2.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2.5*cm, bottomMargin=2.5*cm,
    title='Relatório de Auditoria de Segurança v2 — Collegium',
    author='Codebuff Security Audit'
)
page_width = A4[0] - 4*cm

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(HexColor('#94A3B8'))
    canvas.drawString(2*cm, A4[1] - 1.5*cm, 'Relatório de Auditoria de Segurança v2 — Collegium (Solo Learning)')
    canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.5*cm, f'Página {doc.page}')
    canvas.setStrokeColor(HexColor('#E2E8F0'))
    canvas.line(2*cm, A4[1] - 1.7*cm, A4[0] - 2*cm, A4[1] - 1.7*cm)
    canvas.line(2*cm, 1.8*cm, A4[0] - 2*cm, 1.8*cm)
    canvas.drawCentredString(A4[0]/2, 1.2*cm, f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")} — Confidencial')
    canvas.restoreState()

story = []

# ════════════════════════════════════════
# COVER
# ════════════════════════════════════════
story.append(Spacer(1, 45*mm))
story.append(Paragraph('Relatório de Auditoria de Segurança', sTitle))
story.append(Paragraph('Collegium (Solo Learning) — Re-auditoria (v2)', make_style('Cover2', fontSize=18, leading=24, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=8*mm, fontName='Helvetica-Bold')))
story.append(HRFlowable(width='40%', thickness=2, color=C_FORTE, spaceAfter=8*mm, spaceBefore=2*mm))
story.append(Paragraph(f'Data: {datetime.now().strftime("%d de %B de %Y").replace("August", "agosto")}', make_style('CD2', fontSize=12, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=4*mm)))
story.append(Paragraph('Escopo: Backend (Fastify + Prisma + PostgreSQL) — Verificação de correções aplicadas', make_style('CS2', fontSize=11, textColor=HexColor('#64748B'), alignment=TA_CENTER, spaceAfter=6*mm)))

# Summary box
box_data = [
    [Paragraph(f'<b>{total_all}</b>', make_style('BoxN', fontSize=28, textColor=C_HEADER_BG, alignment=TA_CENTER, fontName='Helvetica-Bold')),
     Paragraph(f'<b>{total_fixed}</b>', make_style('BoxF', fontSize=28, textColor=C_FIXED, alignment=TA_CENTER, fontName='Helvetica-Bold')),
     Paragraph(f'<b>{total_open}</b>', make_style('BoxO', fontSize=28, textColor=C_ALTA, alignment=TA_CENTER, fontName='Helvetica-Bold'))],
    [Paragraph('Total Original', make_style('BoxL1', fontSize=9, textColor=HexColor('#64748B'), alignment=TA_CENTER)),
     Paragraph('Corrigidos ✅', make_style('BoxL2', fontSize=9, textColor=C_FIXED, alignment=TA_CENTER)),
     Paragraph('Abertos ⚠️', make_style('BoxL3', fontSize=9, textColor=C_ALTA, alignment=TA_CENTER))],
]
box_table = Table(box_data, colWidths=[page_width/3]*3)
box_table.setStyle(TableStyle([
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LINEBELOW', (0,0), (-1,0), 1, HexColor('#E2E8F0')),
]))
story.append(box_table)
story.append(Spacer(1, 4*mm))
pct = round(total_fixed * 100 / total_all)
story.append(Paragraph(f'<b>Taxa de correção: {pct}%</b> dos achados originais foram resolvidos.', make_style('Pct', fontSize=11, textColor=C_FORTE, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2*mm)))
story.append(PageBreak())

# ════════════════════════════════════════
# RESUMO EXECUTIVO
# ════════════════════════════════════════
story.append(Paragraph('1. Resumo Executivo', sH1))
story.append(Paragraph(
    f'Esta re-auditoria verifica as correções aplicadas aos {total_all} achados da auditoria original (v1). '
    f'Dos {total_all} achados, <b>{total_fixed} ({pct}%) foram corrigidos</b> e <b>{total_open} permanecem abertos</b>.',
    sBody))

# Open severity table
story.append(Paragraph('<b>Achados Restantes por Severidade:</b>', make_style('OST', fontSize=10, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=3*mm, spaceAfter=2*mm)))
sum_data = [
    [Paragraph('<b>Severidade</b>', sBodySm), Paragraph('<b>Abertos</b>', sBodySm), Paragraph('<b>Corrigidos</b>', sBodySm)],
    ['🔴 Crítica', str(sev_open['CRÍTICA']), str(sev_fixed['CRÍTICA'])],
    ['🟠 Alta', str(sev_open['ALTA']), str(sev_fixed['ALTA'])],
    ['🟡 Média', str(sev_open['MÉDIA']), str(sev_fixed['MÉDIA'])],
    ['🔵 Baixa', str(sev_open['BAIXA']), str(sev_fixed['BAIXA'])],
]
sum_table = Table(sum_data, colWidths=[page_width*0.4, page_width*0.3, page_width*0.3])
sum_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_HEADER_BG), ('TEXTCOLOR', (0,0), (-1,0), white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, C_ROW_ALT]),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(sum_table)
story.append(Spacer(1, 5*mm))

story.append(Image(f'{chart_dir}/comparison.png', width=page_width*0.7, height=page_width*0.5))
story.append(Spacer(1, 4*mm))
story.append(Image(f'{chart_dir}/severity_comparison.png', width=page_width*0.85, height=page_width*0.42))
story.append(PageBreak())

# ════════════════════════════════════════
# CORREÇÕES APLICADAS
# ════════════════════════════════════════
story.append(Paragraph('2. Correções Aplicadas (✅ Corrigidos)', sH1))
story.append(Paragraph(f'Dos {total_all} achados originais, {total_fixed} foram corrigidos. Detalhes abaixo:', sBody))

sev_styles = {
    'CRÍTICA': ('🔴', C_CRITICA), 'ALTA': ('🟠', C_ALTA),
    'MÉDIA': ('🟡', C_MEDIA), 'BAIXA': ('🔵', C_BAIXA),
}

for f in fixed_findings:
    fid, sev, cat, ffile, fline, fshort, fdetail, fcode = f
    emoji, sev_color = sev_styles[sev]
    card_data = [
        [Paragraph(f'<font color="#16A34A"><b>✅ CORRIGIDO</b></font>  <b>{fid}</b>  {emoji} {sev}',
                   make_style('CFH', fontSize=9, fontName='Helvetica-Bold', textColor=HexColor('#1E293B'))), ''],
        [Paragraph(f'<b>{fshort}</b>', make_style('CFS', fontSize=9.5, fontName='Helvetica-Bold', textColor=HexColor('#16A34A'), leading=12)), ''],
        [Paragraph(f'📄 <b>{ffile}</b>:{fline}', make_style('CFF', fontSize=8, fontName='Courier', textColor=HexColor('#64748B'))), ''],
        [Paragraph(fdetail, sBody), ''],
        [Paragraph(f'<font face="Courier" size="7.5"><pre>{fcode}</pre></font>',
                   make_style('CFC', fontSize=7.5, leading=10, backColor=HexColor('#F0FDF4'), borderPadding=3)), ''],
    ]
    ct = Table(card_data, colWidths=[page_width*0.78, page_width*0.22])
    ct.setStyle(TableStyle([
        ('SPAN', (0,1), (1,1)), ('SPAN', (0,2), (1,2)), ('SPAN', (0,3), (1,3)), ('SPAN', (0,4), (1,4)),
        ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, HexColor('#BBF7D0')),
    ]))
    story.append(KeepTogether([ct, Spacer(1, 3*mm)]))

story.append(PageBreak())

# ════════════════════════════════════════
# ACHADOS RESTANTES
# ════════════════════════════════════════
story.append(Paragraph('3. Achados Restantes (⚠️ Abertos)', sH1))
story.append(Paragraph(f'Restem {total_open} achados não corrigidos:', sBody))

cat_groups = {}
for f in open_findings:
    cat = f[2]
    if cat not in cat_groups: cat_groups[cat] = []
    cat_groups[cat].append(f)

for cat, items in cat_groups.items():
    story.append(Paragraph(f'📋 {cat}', sH2))
    for f in items:
        fid, sev, _, ffile, fline, fshort, fdetail, fcode = f
        emoji, sev_color = sev_styles[sev]
        card_data = [
            [Paragraph(f'<b>{fid}</b>  {emoji} {sev}',
                       make_style('OFH', fontSize=9, fontName='Helvetica-Bold', textColor=sev_color)), ''],
            [Paragraph(f'<b>{fshort}</b>', make_style('OFS', fontSize=9.5, fontName='Helvetica-Bold', textColor=C_HEADER_BG, leading=12)), ''],
            [Paragraph(f'📄 <b>{ffile}</b>:{fline}', make_style('OFF', fontSize=8, fontName='Courier', textColor=HexColor('#64748B'))), ''],
            [Paragraph(fdetail, sBody), ''],
            [Paragraph(f'<font face="Courier" size="7.5"><pre>{fcode}</pre></font>',
                       make_style('OFC', fontSize=7.5, leading=10, backColor=HexColor('#FEF2F2'), borderPadding=3)), ''],
        ]
        ct = Table(card_data, colWidths=[page_width*0.78, page_width*0.22])
        ct.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)), ('SPAN', (0,2), (1,2)), ('SPAN', (0,3), (1,3)), ('SPAN', (0,4), (1,4)),
            ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
            ('LINEBELOW', (0,-1), (-1,-1), 0.5, HexColor('#FECACA')),
        ]))
        story.append(KeepTogether([ct, Spacer(1, 3*mm)]))

story.append(PageBreak())

# ════════════════════════════════════════
# RECOMENDAÇÕES
# ════════════════════════════════════════
story.append(Paragraph('4. Recomendações Priorizadas', sH1))

recs = [
    ('P1 — URGENTE', [
        'IDOR-001: Adicionar verificação `existingStudent.instituicao === request.user.instituicao` antes de reatribuir aluno.',
        'XSS-001: Escapar HTML na descrição do bug report antes de injetar no template de e-mail.',
    ]),
    ('P2 — ALTO', [
        'IDOR-002: Verificar se matrículas existentes no batch pertencem à mesma instituição.',
        'ISOLATION-002: Filtrar alunos não atribuídos por instituição do Professor.',
        'AUTH-002: Remover suporte a token via query string em produção.',
    ]),
    ('P3 — MÉDIO', [
        'CONFIG-001: Gerar senhas aleatórias para professores (como já feito para arquitetos).',
        'CONFIG-002: Forçar alteração de código de invocação na primeira criação de turma.',
    ]),
]

for priority, items in recs:
    story.append(Paragraph(f'<b>{priority}</b>', make_style('RP', fontSize=12, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=5*mm, spaceAfter=2*mm)))
    for item in items:
        story.append(Paragraph(f'☐ {item}', make_style('RI', fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), leftIndent=6*mm, spaceAfter=1.5*mm)))

story.append(PageBreak())

# ════════════════════════════════════════
# ISSUES PARA O GITHUB
# ════════════════════════════════════════
story.append(Paragraph('5. Issues para o GitHub', sH1))
story.append(Paragraph('Issues para os achados restantes (os já corrigidos não precisam de issue):', sBody))
story.append(Spacer(1, 3*mm))

issues = [
    {
        'num': 1,
        'title': 'IDOR: reatribuição de alunos entre instituições via POST /admin/stomes',
        'labels': 'security, high',
        'body': '''## Descrição
No endpoint POST /admin/stomes, quando a matrícula já existe, o código atualiza o aluno SEM verificar se pertence à mesma instituição do Arquiteto.

## Evidência
```typescript
// backend/src/routes/admin.ts:441-460
if (existingStudent) {
  const updatedStudent = await prisma.user.update({
    where: { id: existingStudent.id },
    data: {
      turmaId, turno,
      instituicao: request.user.instituicao,  // ⚠️ Sem checar posse!
      institutionId: request.user.institutionId || null
    }
  });
}
```

## Impacto
Um Arquiteto da instituição A pode assumir alunos da instituição B.

## Sugestão
Adicionar: `if (existingStudent.instituicao !== request.user.instituicao) return reply.status(403)...`

## Critérios de Aceite
- [ ] Verificação de posse antes de reatribuir
- [ ] Teste com cross-tenant IDOR
'''
    },
    {
        'num': 2,
        'title': 'IDOR: cadastro em lote não verifica instituição de matrículas existentes',
        'labels': 'security, high',
        'body': '''## Descrição
POST /admin/stomes/batch não verifica se matrículas existentes pertencem à mesma instituição.

## Evidência
```typescript
// backend/src/routes/admin.ts:560+
for (const s of students) {
  await prisma.user.create({
    data: { matricula: s.matricula.toLowerCase().trim(), ... }
    // ⚠️ Sem verificação cross-tenant
  });
}
```

## Impacto
Mesmo impacto do IDOR-001, mas em escala (lote).

## Critérios de Aceite
- [ ] Verificar instituição de matrículas existentes antes de cadastrar
'''
    },
    {
        'num': 3,
        'title': 'Isolamento: alunos não atribuídos listados globalmente para Professores',
        'labels': 'security, medium',
        'body': '''## Descrição
GET /professor/stomes?unassigned=true retorna todos os alunos sem turma de todas as instituições.

## Evidência
```typescript
if (unassigned === 'true') {
  where.turmaId = null;
  // ⚠️ Sem filtro de turmaDisciplinas ou instituição
}
```

## Critérios de Aceite
- [ ] Filtrar por turma: { instituicao } para PROFESSOR quando unassigned=true
'''
    },
    {
        'num': 4,
        'title': 'XSS via e-mail: input injetado em HTML sem sanitização',
        'labels': 'security, high',
        'body': '''## Descrição
A descrição do bug é injetada no HTML do e-mail sem escape.

## Evidência
```typescript
html: `
  <blockquote>
    ${description.replace(/\\n/g, '<br/>')}
  </blockquote>
`
```

## Critérios de Aceite
- [ ] Input sanitizado (escape de <, >, & antes de inserir no HTML)
'''
    },
]

for issue in issues:
    block = f'--- ISSUE {issue["num"]} ---\n\n'
    block += f'### [Segurança] {issue["title"]}\n\n'
    block += f'**Labels:** {issue["labels"]}\n\n'
    block += issue['body']
    block += f'\n--- FIM ISSUE {issue["num"]} ---\n'
    escaped = html_mod.escape(block).replace('\n', '<br/>')
    story.append(Paragraph(escaped, sIssue))
    story.append(Spacer(1, 3*mm))

# ── Build PDF ──
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f'✅ PDF gerado: {output_path}')
