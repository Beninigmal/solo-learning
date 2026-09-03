#!/usr/bin/env python3
"""
Gerador de Vídeo Promocional MP4 — COLLEGIUM
Compila imagens, narração em áudio (gTTS em PT-BR) e efeitos visuais em um arquivo .mp4 real.
"""

import os
import sys
import static_ffmpeg
static_ffmpeg.add_paths()

from gtts import gTTS
from moviepy import AudioFileClip, ImageClip, concatenate_videoclips

BASE_DIR = "/home/beni/Documentos/Projetos/solo-learning"
ART_DIR = "/home/beni/.gemini/antigravity-ide/brain/7e339fce-56e3-4dca-b487-8d596ee2030d"
OUT_MP4 = os.path.join(BASE_DIR, "docs/marketing/video-promocional-collegium.mp4")
OUT_ART_MP4 = os.path.join(ART_DIR, "video-promocional-collegium.mp4")

# Trechos do roteiro e narração em PT-BR
ROTEIRO = [
    {
        "id": "cena1",
        "img": os.path.join(ART_DIR, "collegium_keyart_ptbr_1787950893562.png"),
        "texto": (
            "Como ensinar uma geração que nasceu conectada... "
            "dentro de um modelo educacional desconectado da realidade deles? "
            "O desinteresse não é falta de capacidade. É falta de propósito."
        )
    },
    {
        "id": "cena2",
        "img": os.path.join(ART_DIR, "collegium_scene_ai_tutor_1787950918602.png"),
        "texto": (
            "E se cada tarefa se transformasse em uma Quest épica? "
            "Apresentamos o Collegium. Com Inteligência Artificial integrada, "
            "a IA Tutora analisa a escrita no caderno em tempo real, "
            "corrigindo o raciocínio e recompensando cada conquista com XP!"
        )
    },
    {
        "id": "cena3",
        "img": os.path.join(ART_DIR, "collegium_monarch_dash_1787950947596.png"),
        "texto": (
            "Para os gestores e professores, o Motor Monarch oferece controle total "
            "da matriz curricular, métricas de desempenho por disciplina e relatórios "
            "analíticos em tempo real para a tomada de decisões."
        )
    },
    {
        "id": "cena4",
        "img": os.path.join(ART_DIR, "collegium_keyart_ptbr_1787950893562.png"),
        "texto": (
            "Não mude o aluno. Mude a forma de ensinar. "
            "Traga o Collegium para a sua instituição e desperte os heróis do futuro hoje!"
        )
    }
]

def build_video():
    print("🎙️ Gerando narração em áudio em português (gTTS pt-BR)...")
    video_clips = []
    os.makedirs("/tmp/collegium_assets", exist_ok=True)

    for idx, cena in enumerate(ROTEIRO):
        audio_path = f"/tmp/collegium_assets/audio_{idx}.mp3"
        print(f"   Gerando áudio [{idx+1}/{len(ROTEIRO)}]...")
        tts = gTTS(text=cena["texto"], lang="pt", tld="com.br")
        tts.save(audio_path)

        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration + 1.2 # Margem respiratória de 1.2s por cena

        print(f"   Criando clipe de vídeo [{idx+1}/{len(ROTEIRO)}] (Duração: {duration:.2f}s)...")
        img_clip = ImageClip(cena["img"]).with_duration(duration)
        img_clip = img_clip.with_audio(audio_clip)

        video_clips.append(img_clip)

    print("🎬 Renderizando vídeo MP4 final com MoviePy & FFmpeg...")
    final_clip = concatenate_videoclips(video_clips, method="compose")

    final_clip.write_videofile(
        OUT_MP4,
        fps=24,
        codec="libx264",
        audio_codec="aac"
    )

    print(f"✅ Vídeo MP4 gerado com sucesso em: {OUT_MP4}")

    # Copia para o diretório de artefato para exibição imediata
    import shutil
    shutil.copy(OUT_MP4, OUT_ART_MP4)
    print(f"✅ Cópia para o artefato em: {OUT_ART_MP4}")

if __name__ == "__main__":
    build_video()
