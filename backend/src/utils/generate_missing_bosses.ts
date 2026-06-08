import * as fs from 'fs';
import * as path from 'path';

// List of all 50 D&D epic monsters from the backend quest router
const DND_MONSTERS = [
  'Beholder', 'Lich', 'Dragão Vermelho', 'Mind Flayer', 'Tarrasque',
  'Demogorgon', 'Gorgon', 'Quimera', 'Hidra', 'Cavaleiro da Morte',
  'Mímico', 'Urso-Coruja', 'Vampiro Ancião', 'Golem de Ferro', 'Troll',
  'Drow Arcano', 'Yuan-Ti Abominação', 'Wyvern das Sombras', 'Medusa',
  'Gnoll Demoniaco', 'Tiefling Caído', 'Roc', 'Aboleth', 'Dracolich',
  'Naga Espiritual', 'Esfinge Alada', 'Djinn Maldito', 'Chuul',
  'Glabrezu', 'Balor', 'Marilith', 'Nalfeshnee', 'Vrock', 'Hezrou',
  'Goristro', 'Pit Fiend', 'Erinyes', 'Ice Devil', 'Chain Devil',
  'Bone Devil', 'Barbed Devil', 'Bearded Devil', 'Horned Devil',
  'Night Hag', 'Rakshasa', 'Alhoon', 'Elder Brain', 'Death Knight',
  'Flameskull', 'Wraith'
];

// Map monster names to asset file basenames
const MONSTER_FILE_MAP: Record<string, string> = {
  'Beholder': 'boss_beholder_manhwa.png',
  'Lich': 'boss_lich_manhwa.png',
  'Dragão Vermelho': 'boss_red_dragon_manhwa.png',
  'Mind Flayer': 'boss_mindflayer_manhwa.png',
  'Tarrasque': 'boss_tarrasque_manhwa.png',
  'Demogorgon': 'boss_demogorgon_manhwa.png',
  'Gorgon': 'boss_gorgon_manhwa.png',
  'Quimera': 'boss_chimera_manhwa.png',
  'Hidra': 'boss_hydra_manhwa.png',
  'Cavaleiro da Morte': 'boss_deathknight_manhwa.png',
  'Mímico': 'boss_mimic_manhwa.png',
  'Urso-Coruja': 'boss_owlbear_manhwa.png',
  'Vampiro Ancião': 'boss_vampire_manhwa.png',
  'Golem de Ferro': 'boss_golem_manhwa.png',
  'Troll': 'boss_troll_manhwa.png',
  'Drow Arcano': 'boss_drowarcano_manhwa.png',
  'Yuan-Ti Abominação': 'boss_yuanti_manhwa.png',
  'Wyvern das Sombras': 'boss_shadowwyvern_manhwa.png',
  'Medusa': 'boss_medusa_manhwa.png',
  'Gnoll Demoniaco': 'boss_gnoll_manhwa.png',
  'Tiefling Caído': 'boss_tiefling_manhwa.png',
  'Roc': 'boss_roc_manhwa.png',
  'Aboleth': 'boss_aboleth_manhwa.png',
  'Dracolich': 'boss_dracolich_manhwa.png',
  'Naga Espiritual': 'boss_naga_manhwa.png',
  'Esfinge Alada': 'boss_esfinge_manhwa.png',
  'Djinn Maldito': 'boss_djinn_manhwa.png',
  'Chuul': 'boss_chuul_manhwa.png',
  'Glabrezu': 'boss_glabrezu_manhwa.png',
  'Balor': 'boss_balor_manhwa.png',
  'Marilith': 'boss_marilith_manhwa.png',
  'Nalfeshnee': 'boss_nalfeshnee_manhwa.png',
  'Vrock': 'boss_vrock_manhwa.png',
  'Hezrou': 'boss_hezrou_manhwa.png',
  'Goristro': 'boss_goristro_manhwa.png',
  'Pit Fiend': 'boss_pitfiend_manhwa.png',
  'Erinyes': 'boss_erinyes_manhwa.png',
  'Ice Devil': 'boss_icedevil_manhwa.png',
  'Chain Devil': 'boss_chaindevil_manhwa.png',
  'Bone Devil': 'boss_bonedevil_manhwa.png',
  'Barbed Devil': 'boss_barbeddevil_manhwa.png',
  'Bearded Devil': 'boss_beardeddevil_manhwa.png',
  'Horned Devil': 'boss_horneddevil_manhwa.png',
  'Night Hag': 'boss_nighthag_manhwa.png',
  'Rakshasa': 'boss_rakshasa_manhwa.png',
  'Alhoon': 'boss_alhoon_manhwa.png',
  'Elder Brain': 'boss_elderbrain_manhwa.png',
  'Death Knight': 'boss_deathknight_manhwa.png', // Maps to the same deathknight file
  'Flameskull': 'boss_flameskull_manhwa.png',
  'Wraith': 'boss_wraith_manhwa.png'
};

// Generates specific manhwa-style prompts for each missing D&D boss
function getRecommendedPrompt(monster: string): string {
  const basePrompt = "D&D monster, Solo Leveling manhwa style, extremely detailed webtoon illustration, dark fantasy epic, glowing neon elements, high contrast, dynamic lighting, dark background. No text, no letters, no status bars, no UI elements.";
  
  switch (monster) {
    case 'Nalfeshnee':
      return `Nalfeshnee ${basePrompt.replace('glowing neon elements', 'glowing neon red and yellow fire elements')}. A grotesque winged boar-ape demon roaring with electricity.`;
    case 'Vrock':
      return `Vrock ${basePrompt.replace('glowing neon elements', 'glowing neon green poison spore elements')}. A vulture-like demon screeching and releasing toxic spores.`;
    case 'Hezrou':
      return `Hezrou ${basePrompt.replace('glowing neon elements', 'glowing neon toxic green elements')}. A large toad-like demon with spike ridges, radiating a foul green steam.`;
    case 'Goristro':
      return `Goristro ${basePrompt.replace('glowing neon elements', 'glowing neon orange lava elements')}. A gigantic minotaur-like demon of colossal size, charging forward.`;
    case 'Erinyes':
      return `Erinyes ${basePrompt.replace('glowing neon elements', 'glowing neon red elements')}. A dark-winged fallen angel warrior holding a flaming rope and sword.`;
    case 'Chain Devil':
      return `Chain Devil ${basePrompt.replace('glowing neon elements', 'glowing neon steel blue elements')}. A humanoid figure wrapped in razor-sharp animated chains whipping around.`;
    case 'Bone Devil':
      return `Bone Devil ${basePrompt.replace('glowing neon elements', 'glowing neon white-blue frost elements')}. A skeletal, insectoid devil with a scorpion tail, standing on a pile of bones.`;
    case 'Barbed Devil':
      return `Barbed Devil ${basePrompt.replace('glowing neon elements', 'glowing neon orange fire elements')}. A spiky, fiendish humanoid covered in sharp thorns, claws outstretched.`;
    case 'Bearded Devil':
      return `Bearded Devil ${basePrompt.replace('glowing neon elements', 'glowing neon red hellfire elements')}. A red-skinned devil with a snake-like beard, wielding a massive glaive.`;
    case 'Horned Devil':
      return `Horned Devil ${basePrompt.replace('glowing neon elements', 'glowing neon fire elements')}. A giant winged devil with curled horns and a spiked tail holding a trident.`;
    case 'Alhoon':
      return `Alhoon ${basePrompt.replace('glowing neon elements', 'glowing neon purple psychic elements')}. An undead skeletal mind flayer lich with glowing eyes floating in the air.`;
    default:
      return `${monster} ${basePrompt}`;
  }
}

function run() {
  const assetsDir = path.resolve(__dirname, '../../../frontend/assets');
  console.log(`🔍 Checking assets directory: ${assetsDir}\n`);

  if (!fs.existsSync(assetsDir)) {
    console.error(`❌ Assets directory not found at: ${assetsDir}`);
    process.exit(1);
  }

  const existingFiles = new Set(fs.readdirSync(assetsDir));
  
  const present: string[] = [];
  const missing: string[] = [];

  for (const monster of DND_MONSTERS) {
    const filename = MONSTER_FILE_MAP[monster];
    if (filename && existingFiles.has(filename)) {
      present.push(`${monster} (${filename})`);
    } else {
      missing.push(monster);
    }
  }

  console.log(`✅ FOUND IMAGES FOR (${present.length}/50):`);
  present.forEach(item => console.log(`  - ${item}`));

  console.log(`\n❌ MISSING IMAGES FOR (${missing.length}/50):`);
  missing.forEach(item => console.log(`  - ${item}`));

  if (missing.length > 0) {
    console.log(`\n🚀 AUTOMATED GENERATION SPECIFICATIONS FOR MISSING BOSSES:`);
    console.log(`Use this mapping to generate the missing assets:\n`);
    
    missing.forEach(monster => {
      const filename = MONSTER_FILE_MAP[monster] || `boss_${monster.toLowerCase().replace(/\s+/g, '')}_manhwa.png`;
      const imageName = filename.replace('.png', '');
      const prompt = getRecommendedPrompt(monster);
      console.log(`---`);
      console.log(`Boss Name: ${monster}`);
      console.log(`Target File: frontend/assets/${filename}`);
      console.log(`generate_image tool inputs:`);
      console.log(`  ImageName: "${imageName}"`);
      console.log(`  Prompt: "${prompt}"`);
    });
  } else {
    console.log(`\n🎉 All 50 D&D bosses have corresponding asset images!`);
  }
}

run();
