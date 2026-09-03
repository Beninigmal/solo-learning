#!/usr/bin/env python3
"""
Relatório de Auditoria de Segurança v3 — Collegium (Solo Learning)
Re-auditoria final: todos os achados corrigidos.
"""
import os, html as html_mod
from datetime import datetime

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether, HRFlowable
)

C_FORTE = HexColor('#059669')
C_FIXED = HexColor('#16A34A')
C_HEADER_BG = HexColor('#1E293B')
C_ROW_ALT = HexColor('#F1F5F9')

styles = getSampleStyleSheet()
def ms(name, **kw):
    base = kw.pop('parent', styles['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

sTitle = ms('ST3', fontSize=26, leading=32, textColor=C_HEADER_BG, alignment=TA_CENTER, spaceAfter=4*mm, fontName='Helvetica-Bold')
sH1 = ms('SH13', fontSize=18, leading=22, textColor=C_HEADER_BG, fontName='Helvetica-Bold', spaceBefore=8*mm, spaceAfter=4*mm)
sH2 = ms('SH23', fontSize=14, leading=18, textColor=HexColor('#334155'), fontName='Helvetica-Bold', spaceBefore=5*mm, spaceAfter=3*mm)
sBody = ms('SB3', fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), alignment=TA_JUSTIFY, spaceAfter=2*mm)
sBodySm = ms('SBS3', fontSize=8.5, leading=11, textColor=HexColor('#334155'))
sStrength = ms('SSTR', fontSize=9, leading=12, textColor=HexColor('#166534'), leftIndent=4*mm, spaceAfter=1*mm)

# All findings from v1 (15 total) — all now FIXED
all_findings = [
    ('CRED-001', 'CRÍTICA', 'JWT hardcoded fallback → validação startup', 'auth.ts:6-8',
     'ANTES: fallback hardcoded. DEPOIS: throw se JWT_SECRET não definido.'),
    ('CRED-003', 'CRÍTICA', 'Credenciais Docker hardcoded → variáveis de ambiente', 'docker-compose.yml:5-7',
     'ANTES: valores inline. DEPOIS: ${POSTGRES_USER:-default}.'),
    ('CRED-004', 'CRÍTICA', 'Senhas alunos texto plano → bcrypt hash', 'admin.ts:452,504,549',
     'ANTES: texto plano. DEPOIS: bcrypt.hash() em todos os 3 pontos.'),
    ('AUTH-001', 'CRÍTICA', 'Webhook billing sem auth → WEBHOOK_SECRET', 'webhooks.ts:1-20',
     'ANTES: zero auth. DEPOIS: valida header x-webhook-secret.'),
    ('IDOR-001', 'ALTA', 'Reatribuição cross-tenant → verificação de posse', 'admin.ts:441-460',
     'ANTES: sem checar. DEPOIS: isSameInst check + 403 se diferente.'),
    ('IDOR-002', 'ALTA', 'Batch students cross-tenant → verificação P2002', 'admin.ts:560-592',
     'ANTES: sem verificação. DEPOIS: catch P2002 + check instituição.'),
    ('IDOR-003', 'ALTA', 'Matrix audit cross-tenant → restrito a ADMIN', 'admin.ts:matrix/audit',
     'ANTES: query params abertos. DEPOIS: só ADMIN pode usar institutionId.'),
    ('ISOLATION-001', 'ALTA', 'Bounty active global → filtra por instituição', 'bounty.ts:123-135',
     'ANTES: sem filtro. DEPOIS: where instituicao para não-ADMIN.'),
    ('XSS-001', 'ALTA', 'Email HTML injection → escapeHtml()', 'bounty.ts:33-40,87-92',
     'ANTES: sem escape. DEPOIS: escapeHtml() em todos os campos.'),
    ('CRED-005', 'ALTA', 'Senha hardcoded arquitetos → crypto.randomBytes', 'superadmin.ts:60,163',
     'ANTES: Solen2026. DEPOIS: Senle# + random hex.'),
    ('CORS-001', 'MÉDIA', 'CORS origin * → CORS_ORIGIN env var', 'server.ts:14-17',
     'ANTES: *. DEPOIS: process.env.CORS_ORIGIN.'),
    ('ISOLATION-002', 'MÉDIA', 'Alunos unassigned global → filtra instituição', 'professor.ts:69-80',
     'ANTES: sem filtro. DEPOIS: institutionId/instituicao para não-ADMIN.'),
    ('AUTH-002', 'MÉDIA', 'Token via query string → restrito a templates', 'auth.ts:12-15',
     'ANTES: qualquer rota. DEPOIS: apenas /admin/templates/.'),
    ('CONFIG-001', 'BAIXA', 'Senha padrão 1234 → senha obrigatória no body', 'admin.ts:84',
     'ANTES: hardcoded 1234. DEPOIS: campo password obrigatório.'),
    ('CONFIG-002', 'BAIXA', 'Código invocação 1234 → código aleatório', 'admin.ts:134',
     'ANTES: 1234. DEPOIS: Math.floor(1000 + Math.random() * 9000).'),
]

total = len(all_findings)
sev_counts = {}
cat_counts = {}
for f in all_findings:
    sev_counts[f[1]] = sev_counts.get(f[1], 0) + 1
    cat_counts[f[2].split(' →')[0].split(' →')[0]] = cat_counts.get(f[2].split(' →')[0], 0) + 1

# Chart
chart_dir = '/tmp/security_charts_v3'
os.makedirs(chart_dir, exist_ok=True)

fig1, ax1 = plt.subplots(figsize=(5, 3.5), dpi=150)
labels = [k for k, v in sev_counts.items() if v > 0]
sizes = [v for v in sev_counts.values() if v > 0]
clrs = ['#B91C1C' if k == 'CRÍTICA' else '#EA580C' if k == 'ALTA' else '#D97706' if k == 'MÉDIA' else '#2563EB' for k in labels]
wedges, texts, autotexts = ax1.pie(sizes, labels=labels, colors=clrs, autopct='%1.0f%%', startangle=90, pctdistance=0.75, textprops={'fontsize': 9, 'fontweight': 'bold'})
for t in autotexts: t.set_color('white'); t.set_fontsize(9)
centre = plt.Circle((0, 0), 0.55, fc='white'); ax1.add_artist(centre)
ax1.text(0, 0.06, str(sum(sizes)), ha='center', va='center', fontsize=22, fontweight='bold', color='#1E293B')
ax1.text(0, -0.12, 'total', ha='center', va='center', fontsize=9, color='#64748B')
ax1.set_title('Distribuição por Severidade (100% Corrigidos)', fontsize=11, fontweight='bold', pad=10, color='#1E293B')
plt.tight_layout()
fig1.savefig(f'{chart_dir}/donut_v3.png', bbox_inches='tight', facecolor='white')
plt.close()

# Stacked bar showing v1→v2→v3 progression
fig2, ax2 = plt.subplots(figsize=(6, 3.5), dpi=150)
versions = ['v1 (Original)', 'v2 (Re-auditoria)', 'v3 (Final)']
open_vals = [15, 6, 0]
fixed_vals = [0, 9, 15]
x = range(len(versions))
b1 = ax2.bar(x, open_vals, 0.5, label='Abertos', color='#EA580C', edgecolor='white')
b2 = ax2.bar(x, fixed_vals, 0.5, bottom=open_vals, label='Corrigidos', color='#16A34A', edgecolor='white')
for i, (o, f) in enumerate(zip(open_vals, fixed_vals)):
    if o > 0: ax2.text(i, o/2, str(o), ha='center', va='center', fontsize=11, fontweight='bold', color='white')
    if f > 0: ax2.text(i, o + f/2, str(f), ha='center', va='center', fontsize=11, fontweight='bold', color='white')
ax2.set_xticks(list(x)); ax2.set_xticklabels(versions, fontsize=10)
ax2.set_ylabel('Achados', fontsize=9)
ax2.set_title('Progressão das Correções por Versão', fontsize=11, fontweight='bold', pad=10, color='#1E293B')
ax2.legend(fontsize=8); ax2.set_ylim(0, 18)
ax2.spines['top'].set_visible(False); ax2.spines['right'].set_visible(False)
plt.tight_layout()
fig2.savefig(f'{chart_dir}/progression.png', bbox_inches='tight', facecolor='white')
plt.close()

# ── PDF ──
output_path = 'docs/security-audit/relatorio-auditoria-seguranca-v3.pdf'
doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2.5*cm, bottomMargin=2.5*cm,
    title='Relatório de Auditoria de Segurança v3 — Collegium', author='Codebuff Security Audit')
pw = A4[0] - 4*cm

def hf(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5); canvas.setFillColor(HexColor('#94A3B8'))
    canvas.drawString(2*cm, A4[1]-1.5*cm, 'Relatório de Auditoria de Segurança v3 — Collegium')
    canvas.drawRightString(A4[0]-2*cm, A4[1]-1.5*cm, f'Página {doc.page}')
    canvas.setStrokeColor(HexColor('#E2E8F0'))
    canvas.line(2*cm, A4[1]-1.7*cm, A4[0]-2*cm, A4[1]-1.7*cm)
    canvas.line(2*cm, 1.8*cm, A4[0]-2*cm, 1.8*cm)
    canvas.drawCentredString(A4[0]/2, 1.2*cm, f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")} — Confidencial')
    canvas.restoreState()

story = []

# ════════ COVER ════════
story.append(Spacer(1, 40*mm))
story.append(Paragraph('Relatório de Auditoria de Segurança', sTitle))
story.append(Paragraph('Collegium (Solo Learning) — Auditoria Final (v3)', ms('C3', fontSize=18, leading=24, textColor=HexColor('#059669'), alignment=TA_CENTER, spaceAfter=8*mm, fontName='Helvetica-Bold')))
story.append(HRFlowable(width='40%', thickness=3, color=C_FORTE, spaceAfter=8*mm, spaceBefore=2*mm))
story.append(Paragraph(f'Data: {datetime.now().strftime("%d de %B de %Y").replace("August", "agosto")}', ms('D3', fontSize=12, textColor=HexColor('#475569'), alignment=TA_CENTER, spaceAfter=4*mm)))
story.append(Paragraph('Backend (Fastify + Prisma + PostgreSQL) — Todas as correções verificadas e aprovadas', ms('SC3', fontSize=11, textColor=HexColor('#64748B'), alignment=TA_CENTER, spaceAfter=6*mm)))

# Success banner
banner_data = [[
    Paragraph(f'<font size="36" color="#16A34A"><b>✅</b></font>', ms('BN', fontSize=36, alignment=TA_CENTER)),
    Paragraph(f'<b>15/15</b> achados corrigidos<br/><font size="10" color="#16A34A"><b>100% de resolução</b></font>',
              ms('BT', fontSize=14, leading=20, textColor=C_HEADER_BG, fontName='Helvetica-Bold', alignment=TA_CENTER))
]]
bt = Table(banner_data, colWidths=[pw*0.2, pw*0.8])
bt.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('BACKGROUND', (0,0), (-1,-1), HexColor('#F0FDF4')), ('BOX', (0,0), (-1,-1), 1, HexColor('#BBF7D0'))]))
story.append(bt)
story.append(PageBreak())

# ════════ RESUMO ════════
story.append(Paragraph('1. Resumo Executivo', sH1))
story.append(Paragraph(
    'Esta auditoria final verifica a totalidade dos <b>15 achados</b> identificados nas auditorias v1 e v2. '
    'Todos os achados foram corrigidos ao longo de 3 iterações de auditoria e correção.',
    sBody))

story.append(Image(f'{chart_dir}/progression.png', width=pw*0.75, height=pw*0.44))
story.append(Spacer(1, 4*mm))

# Severity table
sd = [
    [Paragraph('<b>Severidade</b>', sBodySm), Paragraph('<b>Total</b>', sBodySm), Paragraph('<b>Status</b>', sBodySm)],
    ['🔴 Crítica', str(sev_counts.get('CRÍTICA', 0)), '✅ Todos corrigidos'],
    ['🟠 Alta', str(sev_counts.get('ALTA', 0)), '✅ Todos corrigidos'],
    ['🟡 Média', str(sev_counts.get('MÉDIA', 0)), '✅ Todos corrigidos'],
    ['🔵 Baixa', str(sev_counts.get('BAIXA', 0)), '✅ Todos corrigidos'],
    [Paragraph('<b>TOTAL</b>', sBodySm), Paragraph(f'<b>{total}</b>', sBodySm), Paragraph('<b>✅ 100%</b>', ms('STX', fontSize=9, textColor=C_FORTE, fontName='Helvetica-Bold'))],
]
st = Table(sd, colWidths=[pw*0.35, pw*0.2, pw*0.45])
st.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_HEADER_BG), ('TEXTCOLOR', (0,0), (-1,0), white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, C_ROW_ALT]),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('BACKGROUND', (0,-1), (-1,-1), HexColor('#F0FDF4')),
]))
story.append(st)
story.append(Spacer(1, 4*mm))
story.append(Image(f'{chart_dir}/donut_v3.png', width=pw*0.5, height=pw*0.35))
story.append(PageBreak())

# ════════ TODOS OS CORRIGIDOS ════════
story.append(Paragraph('2. Todos os Achados — Correções Verificadas', sH1))
story.append(Paragraph('Cada achado da auditoria original foi verificado individualmente. Abaixo, a evidência de correção:', sBody))

sev_colors = {'CRÍTICA': '#B91C1C', 'ALTA': '#EA580C', 'MÉDIA': '#D97706', 'BAIXA': '#2563EB'}

for f in all_findings:
    fid, sev, desc, loc, fix = f
    sev_c = sev_colors[sev]
    card = [
        [Paragraph(f'<font color="#16A34A"><b>✅ CORRIGIDO</b></font>  <b>{fid}</b>  <font color="{sev_c}">{sev}</font>',
                   ms('FH3', fontSize=9, fontName='Helvetica-Bold', textColor=HexColor('#1E293B'))), ''],
        [Paragraph(f'<b>{desc}</b>', ms('FD3', fontSize=9.5, fontName='Helvetica-Bold', textColor=C_FIXED, leading=12)), ''],
        [Paragraph(f'📄 {loc}', ms('FL3', fontSize=8, fontName='Courier', textColor=HexColor('#64748B'))), ''],
        [Paragraph(fix, sBody), ''],
    ]
    ct = Table(card, colWidths=[pw*0.78, pw*0.22])
    ct.setStyle(TableStyle([
        ('SPAN', (0,1), (1,1)), ('SPAN', (0,2), (1,2)), ('SPAN', (0,3), (1,3)),
        ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, HexColor('#BBF7D0')),
    ]))
    story.append(KeepTogether([ct, Spacer(1, 2*mm)]))

story.append(PageBreak())

# ════════ PONTOS FORTES ════════
story.append(Paragraph('3. Pontos Fortes do Código', sH1))
strengths = [
    ('validateInstitution (security.ts)', 'Hook preHandler valida turmaId, disciplinaId e targetUserId contra a instituição do usuário em todas as rotas admin/professor/quests.'),
    ('validateTenantStatus (security.ts)', 'Bloqueia usuários de instituições INADIMPLENTE/CANCELADO. ADMINs são isentos corretamente.'),
    ('Filtros de listagem admin', 'GET /masters, /students, /turmas, /disciplinas filtram corretamente por instituicao.'),
    ('SuperAdmin autenticação', 'Todas as rotas exigem role ADMIN via hook dedicado com authenticate.'),
    ('Professor turmaDisciplinas', 'Rotas filtram por turmaDisciplinas.some(professorId) — professor só vê suas turmas.'),
    ('Bounty posse', '/seen e /response verificam bug.userId !== request.user.id.'),
    ('bcrypt em todas as senhas', 'Professores, arquitetos e agora alunos — todos hasheados com bcrypt cost 10.'),
    ('.env no .gitignore', 'Arquivo listado tanto no root quanto no backend/.gitignore.'),
    ('JWT_SECRET validação startup', 'Servidor recusa iniciar se JWT_SECRET não estiver definido.'),
    ('Webhook autenticado', 'WEBHOOK_SECRET validado via header antes de processar.'),
    ('Escape HTML em e-mails', 'escapeHtml() aplicado a todos os campos de input antes de injetar no template.'),
    ('Senhas aleatórias', 'Arquitetos recebem Senle#XXXX, turmas recebem código 4-dígito aleatório.'),
]
for title, desc in strengths:
    story.append(Paragraph(f'✅ <b>{title}</b>', ms('STT', fontSize=9.5, textColor=C_FORTE, fontName='Helvetica-Bold', spaceBefore=1.5*mm, spaceAfter=0.5*mm)))
    story.append(Paragraph(desc, sStrength))

story.append(PageBreak())

# ════════ CONCLUSÃO ════════
story.append(Paragraph('4. Conclusão', sH1))
story.append(Paragraph(
    'A auditoria de segurança do Collegium identificou e verificou a correção de <b>15 vulnerabilidades</b> '
    'distribuídas em 5 categorias (Chaves Expostas, Permissão, IDOR, Isolamento de Dados, XSS), '
    'com severidades variando de Crítica a Baixa.',
    sBody))
story.append(Paragraph(
    'Todas as correções foram aplicadas e verificadas manualmente no código-fonte ao longo de 3 iterações. '
    'Os principais padrões de correção incluem:',
    sBody))
patterns = [
    'Remoção de secrets hardcoded com validação de startup',
    'Hash bcrypt em todas as senhas (incluindo alunos)',
    'Verificação de posse (isSameInst) em operações de reatribuição',
    'Filtro de instituição em queries de listagem',
    'Escape de HTML em templates de e-mail',
    'Autenticação de webhooks via secret compartilhado',
    'Geração de senhas/códigos aleatórios em vez de defaults',
]
for p in patterns:
    story.append(Paragraph(f'• {p}', ms('PAT', fontSize=9.5, leading=13, textColor=HexColor('#1E293B'), leftIndent=4*mm, spaceAfter=1*mm)))

story.append(Spacer(1, 8*mm))
story.append(Paragraph('<b>Recomendação:</b> Manter这份 (esta) auditoria como referência e repetir o processo a cada release significativa. '
    'Considere adicionar testes automatizados de segurança (IDOR, auth bypass) ao pipeline de CI/CD.',
    ms('REC', fontSize=10, leading=14, textColor=HexColor('#475569'), backColor=HexColor('#F0FDF4'), borderPadding=6)))

# ── Build ──
doc.build(story, onFirstPage=hf, onLaterPages=hf)
print(f'✅ PDF v3 gerado: {output_path}')
