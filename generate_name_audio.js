const fs = require('fs');
const https = require('https');
const path = require('path');

// ── CONFIG ──
const ELEVENLABS_API_KEY = 'sk_aacd9b4aea77f8fcf050661d33b7a2337eec8bacd80608fb';

// Parse --name argument
const nameArg = process.argv.find(a => a.startsWith('--name'));
const HERO_NAME = nameArg ? process.argv[process.argv.indexOf(nameArg) + 1] : null;

if (!HERO_NAME) {
  console.log('Usage: node generate_name_audio.js --name Maya');
  console.log('       node generate_name_audio.js --name Kathy');
  console.log('       node generate_name_audio.js --name Aiden');
  console.log('\nGenerates personalized story audio for a specific kid.');
  console.log('Only re-generates lines that contain the kid\'s name.');
  process.exit(1);
}

console.log(`\n🎤 Generating personalized audio for: ${HERO_NAME}\n`);

// Voice map — same voices as main generator
const VOICE_MAP = {
  'Narrator': 'D38z5RcWu1voky8WS1ja', // Fin
  'Spider-Man': 'N2lVS1w4EtoT3dr4eOWO', // Callum
  'Anakin Skywalker': '2EiwWnXFnvU5JabPnv8n', // Clyde
  'Anakin': '2EiwWnXFnvU5JabPnv8n', // Clyde
  'System': 'MF3mGyEYCl7XYWbV9V6O', // Elli
  'Luke Skywalker': '2EiwWnXFnvU5JabPnv8n', // Clyde
  // Kid lines use Callum (energetic young voice)
  '_HERO_': 'N2lVS1w4EtoT3dr4eOWO', // Callum
};

// Only the story panels that contain {HERO} — these need per-tenant audio
// Format: { storyId, panelIndex, text (with {HERO} replaced), speaker }
function getPersonalizedPanels(name) {
  return [
    // world1_complete
    { storyId: 'world1_complete', idx: 2, text: `${name} puts it on. A lightsaber ignites! The Force awakens!`, speaker: 'Narrator' },
    { storyId: 'world1_complete', idx: 3, text: `NEW: Jedi ${name}! May the Force be with you!`, speaker: 'System' },
    // world2_intro
    { storyId: 'world2_intro', idx: 2, text: '"Green Goblin stole a TIE Fighter!"', speaker: name },
    // world3_complete
    { storyId: 'world3_complete', idx: 1, text: `${name} combines Spider powers AND the Force!`, speaker: 'Narrator' },
    { storyId: 'world3_complete', idx: 2, text: `NEW: Spider-Jedi ${name}! The ultimate hero!`, speaker: 'System' },
    // world4_intro
    { storyId: 'world4_intro', idx: 2, text: '"This is it. Everything comes down to this fight."', speaker: name },
    // world4_complete
    { storyId: 'world4_complete', idx: 4, text: '"I saved TWO universes! Best. Day. EVER!"', speaker: name },
    { storyId: 'world4_complete', idx: 5, text: `CONGRATULATIONS ${name.toUpperCase()}! ULTIMATE HERO!`, speaker: 'System' },
    // milestone_15
    { storyId: 'milestone_15', idx: 1, text: '"I can feel it bonding with the suit. It wants to help us fight."', speaker: name },
    // milestone_20
    { storyId: 'milestone_20', idx: 4, text: '"Then let\'s go get it. All of us. Together."', speaker: name },
    // milestone_25
    { storyId: 'milestone_25', idx: 1, text: '"The Mandalorian left his helmet here. He was trying to warn us about Darth Venom..."', speaker: name },
    // milestone_30
    { storyId: 'milestone_30', idx: 3, text: '"Every hero we\'ve met... every power we\'ve gained... it all comes down to this."', speaker: name },
  ];
}

async function generateSpeech(text, voiceId, outputPath) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    });

    const req = https.request(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error(`  ❌ Error ${res.statusCode} for: "${text.substring(0, 50)}..."`);
        res.on('data', d => console.error('    ', d.toString()));
        return resolve();
      }
      
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✅ ${path.basename(outputPath)}`);
        resolve();
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function run() {
  const tenantLower = HERO_NAME.toLowerCase();
  const audioDir = path.join(__dirname, 'assets', 'audio', 'tenants', tenantLower);
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const panels = getPersonalizedPanels(HERO_NAME);
  let generated = 0;
  let skipped = 0;

  for (const panel of panels) {
    // Resolve voice — if speaker is the kid's name, use the hero voice
    let voiceId = VOICE_MAP[panel.speaker] || VOICE_MAP['_HERO_'] || VOICE_MAP['Narrator'];
    
    // Output: assets/audio/tenants/maya/story_world1_complete_2.mp3
    const outputPath = path.join(audioDir, `story_${panel.storyId}_${panel.idx}.mp3`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  Skipping ${path.basename(outputPath)} (already exists)`);
      skipped++;
      continue;
    }

    await generateSpeech(panel.text, voiceId, outputPath);
    generated++;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✨ Done! Generated ${generated} clips, skipped ${skipped}.`);
  console.log(`📁 Audio saved to: ${audioDir}`);
  console.log(`\nTo regenerate, delete the files in that folder and run again.`);
}

run().catch(console.error);
