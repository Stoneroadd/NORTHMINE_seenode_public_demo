# -*- coding: utf-8 -*-
"""Merges the pitch deck and the FMS resilience framework into the master
manual (northmine_presentacion_maestra.html), under one shared sidebar nav.
The 32MB manual is the base; the two smaller documents are stripped of their
own topnav/hero-chrome/script and spliced in as regular flow sections."""
import re

BASE = r"C:\Users\maste\Downloads\northmine_presentacion_maestra.html"
PITCH = r"C:\Users\maste\Downloads\northmine_pitch_startup.html"
FMS = r"C:\Users\maste\Downloads\northmine_fms_resilience.html"
OUT = r"C:\Users\maste\Downloads\northmine_presentacion_maestra.html"

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

pitch_html = read(PITCH)
fms_html = read(FMS)
base_html = read(BASE)

# --- extract pitch: style + body (hero..close, drop topnav/script/footer) ---
pitch_style = re.search(r"<style>(.*?)</style>", pitch_html, re.DOTALL).group(1)
pitch_body_start = pitch_html.index('<section class="hero">')
pitch_body_end = pitch_html.index('<div class="footer wrap">')
pitch_body = pitch_html[pitch_body_start:pitch_body_end]

# --- extract fms: style + body, with id collisions renamed ---
fms_style = re.search(r"<style>(.*?)</style>", fms_html, re.DOTALL).group(1)
fms_body_start = fms_html.index('<section class="hero" id="hero">')
fms_body_end = fms_html.index('<div class="footer wrap">')
fms_body = fms_html[fms_body_start:fms_body_end]

fms_body = fms_body.replace('id="hero"', 'id="fr-hero"', 1)
fms_body = fms_body.replace('id="arquitectura"', 'id="fr-arquitectura"', 1)
fms_body = fms_body.replace('id="cierre"', 'id="fr-cierre"', 1)

# renumber page-tags 01..14 -> 25..39, and the close section's hardcoded "15 ·"
for old, new in zip(range(1, 15), range(25, 39)):
    fms_body = fms_body.replace(f'<div class="page-tag">{old:02d}</div>', f'<div class="page-tag">{new}</div>', 1)
fms_body = fms_body.replace('<div class="kicker">15 · Conclusión</div>', '<div class="kicker">39 · Conclusión</div>', 1)

assert 'id="hero"' not in fms_body
assert 'id="arquitectura"' not in fms_body
assert 'id="cierre"' not in fms_body

# ---------------------------------------------------------------------------
# splice CSS before the outer </style>
assert base_html.count("</style>") == 1
extra_css = f"\n/* === pitch deck (unified) === */\n{pitch_style}\n/* === fms resilience framework (unified) === */\n{fms_style}\n"
base_html = base_html.replace("</style>", extra_css + "</style>", 1)

# ---------------------------------------------------------------------------
# splice nav links
NAV_OLD = """    <a href="#inicio">Inicio</a>
    <a href="#pitch">01 · Pitch General</a>"""
NAV_PITCH_LINKS = """    <a href="#inicio">Inicio</a>
    <a href="#mvv">00A · Misión y Valores</a>
    <a href="#problemas">00B · Las 10 Problemáticas</a>
    <a href="#mapa-problemas">00C · Mapa de Problemas</a>
    <a href="#como-funciona">00D · Cómo Funciona</a>
    <a href="#modulos">00E · Módulos en Simple</a>
    <a href="#no-fms">00F · Por Qué No es un FMS</a>
    <a href="#diferencia">00G · Diferenciación</a>
    <a href="#valor">00H · Valor Agregado</a>
    <a href="#pitch">01 · Pitch General</a>"""
assert base_html.count(NAV_OLD) == 1
base_html = base_html.replace(NAV_OLD, NAV_PITCH_LINKS, 1)

NAV_END_OLD = '    <a href="#problematica">24 · Problemática y soluciones</a>\n  </nav>'
NAV_FMS_LINKS = """    <a href="#problematica">24 · Problemática y soluciones</a>
    <a href="#realidad">25 · FMS: La Primera Realidad</a>
    <a href="#info-restringida">26 · FMS: Información Restringida</a>
    <a href="#caso-critico">27 · FMS: Caso Crítico Pala DOWN</a>
    <a href="#rutas">28 · FMS: Cambio de Rutas</a>
    <a href="#material">29 · FMS: Integridad del Material</a>
    <a href="#recuperacion">30 · FMS: Cuando Vuelve el Sistema</a>
    <a href="#perfil">31 · FMS: Perfil Multiskill</a>
    <a href="#conocimiento">32 · FMS: Conocimiento Operacional</a>
    <a href="#failure-intel">33 · FMS: Failure Intelligence</a>
    <a href="#ejemplo">34 · FMS: Ejemplo Analítico</a>
    <a href="#bigdata">35 · FMS: Big Data Mantenimiento</a>
    <a href="#fr-arquitectura">36 · FMS: Arquitectura de Valor</a>
    <a href="#resiliencia">37 · FMS: Resiliencia Operacional</a>
    <a href="#post-incident">38 · FMS: Post-Incident Review</a>
  </nav>"""
assert base_html.count(NAV_END_OLD) == 1
base_html = base_html.replace(NAV_END_OLD, NAV_FMS_LINKS, 1)

# ---------------------------------------------------------------------------
# splice pitch body right before the existing "01 Pitch General" section
ANCHOR_PITCH_INSERT = '<section class="doc-section" id="pitch">'
assert base_html.count(ANCHOR_PITCH_INSERT) == 1
base_html = base_html.replace(ANCHOR_PITCH_INSERT, pitch_body + "\n" + ANCHOR_PITCH_INSERT, 1)

# splice fms body right before the footer
ANCHOR_FOOTER = '<section class="footer">'
assert base_html.count(ANCHOR_FOOTER) == 1
base_html = base_html.replace(ANCHOR_FOOTER, fms_body + "\n" + ANCHOR_FOOTER, 1)

# ---------------------------------------------------------------------------
# update footer blurb
FOOTER_OLD = ('<strong>Estado de la presentación:</strong> documento consolidado — pitch general, cockpit, resumen y turno en detalle, '
              'más los 17 módulos restantes documentados con capturas reales del sistema en ejecución '
              '(admin, demo y una cuenta administrativa real) y tres mapas conceptuales ilustrados '
              '(arquitectura, fases del proceso, problemática y soluciones).')
FOOTER_NEW = ('<strong>Estado de la presentación:</strong> documento unificado — pitch de startup (misión, visión, valores, '
              '10 problemáticas y soluciones), manual técnico con capturas reales de los 20 módulos del sistema '
              '(pitch general, cockpit, resumen, turno y el resto documentados en detalle), tres mapas conceptuales '
              'ilustrados, y el framework de continuidad operacional NORTHMINE FMS Resilience.')
assert base_html.count(FOOTER_OLD) == 1
base_html = base_html.replace(FOOTER_OLD, FOOTER_NEW, 1)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(base_html)
print(f"wrote {len(base_html)/1e6:.1f} MB to {OUT}")
