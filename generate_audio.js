const fs = require('fs');
const https = require('https');
const path = require('path');

// Found in D:\bomber-3d\brewandboard\.env
const ELEVENLABS_API_KEY = 'sk_aacd9b4aea77f8fcf050661d33b7a2337eec8bacd80608fb';

const HERO_NAME = 'Aiden';

const STORY_PANELS = {
  intro_rift: {
    panels: [
      { text: 'Spider-Man swings through New York City on a normal day...', speaker: 'Narrator' },
      { text: 'BOOM! A giant portal rips open! The Rift King has merged Doc Ock tech with Sith Holocrons!', speaker: 'Narrator' },
      { text: 'Stormtroopers march into Times Square! TIE Fighters zoom overhead!', speaker: 'Narrator' },
      { text: '"My Spidey Sense is CRAZY! Anakin! Mando! I need backup!"', speaker: 'Spider-Man' },
      { text: `"Tag me in, Spidey! Let's GO!"`, speaker: 'Anakin Skywalker' },
    ],
  },
  world1_complete: {
    panels: [
      { text: 'Doc Ock is defeated! The first Rift Crystal is safe!', speaker: 'Narrator' },
      { text: 'A glowing Jedi robe falls through the rift...', speaker: 'Narrator' },
      { text: `${HERO_NAME} puts it on. A lightsaber ignites! The Force awakens!`, speaker: 'Narrator' },
      { text: `NEW: Jedi ${HERO_NAME}! May the Force be with you!`, speaker: 'System' },
    ],
  },
  world2_intro: {
    panels: [
      { text: 'The portal leads to a massive Imperial Space Station...', speaker: 'Narrator' },
      { text: 'Oscorp tech is fused with the Empire! Symbiotes in SPACE!', speaker: 'Narrator' },
      { text: '"Green Goblin stole a TIE Fighter!"', speaker: HERO_NAME },
    ],
  },
  world2_complete: {
    panels: [
      { text: 'Green Goblin\'s TIE Glider crashes! Rift Crystal number 2 secured!', speaker: 'Narrator' },
      { text: 'The symbiote bonds with Spider-Man\'s suit... it turns BLACK!', speaker: 'Narrator' },
      { text: 'NEW: Black Suit Spider-Man!', speaker: 'System' },
    ],
  },
  world3_intro: {
    panels: [
      { text: 'A desert planet with two suns... that\'s Tatooine!', speaker: 'Spider-Man' },
      { text: '"The Mandalorian is waiting for us ahead!"', speaker: 'Anakin' },
      { text: '"Watch out... Darth Vader found a symbiote. He is DARTH VENOM!"', speaker: 'Narrator' },
    ],
  },
  world3_complete: {
    panels: [
      { text: 'Darth Venom is defeated! The symbiote releases Vader!', speaker: 'Narrator' },
      { text: `${HERO_NAME} combines Spider powers AND the Force!`, speaker: 'Narrator' },
      { text: `NEW: Iron ${HERO_NAME}! The ultimate high-tech hero!`, speaker: 'System' },
    ],
  },
  world4_intro: {
    panels: [
      { text: 'Both worlds are fully colliding! NYC floats in space!', speaker: 'Narrator' },
      { text: 'The Rift King — Doc Ock fused with the Emperor — controls it all!', speaker: 'Narrator' },
      { text: '"This is it. Everything comes down to this fight."', speaker: HERO_NAME },
    ],
  },
  world4_complete: {
    panels: [
      { text: 'THE RIFT KING IS DEFEATED!', speaker: 'Narrator' },
      { text: 'The Rift seals shut! Both worlds are saved!', speaker: 'Narrator' },
      { text: '"May the Force be with you, Spidey!"', speaker: 'Luke Skywalker' },
      { text: '"You too! Call me anytime!"', speaker: 'Spider-Man' },
      { text: `"I saved TWO universes! Best. Day. EVER!"`, speaker: HERO_NAME },
      { text: `CONGRATULATIONS ${HERO_NAME.toUpperCase()}! ULTIMATE HERO!`, speaker: 'System' },
      { text: 'VENOM UNLOCKED! "We... are... VENOM!"', speaker: 'System' },
    ],
  },
};

const VOICE_MAP = {
  'Narrator': 'D38z5RcWu1voky8WS1ja', // Fin
  'Spider-Man': 'N2lVS1w4EtoT3dr4eOWO', // Callum
  'Anakin Skywalker': '2EiwWnXFnvU5JabPnv8n', // Clyde
  'System': 'MF3mGyEYCl7XYWbV9V6O', // Elli
  'Luke Skywalker': '2EiwWnXFnvU5JabPnv8n', // Clyde
  'Aiden': 'N2lVS1w4EtoT3dr4eOWO', // Callum
};

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
        console.error(`Error ${res.statusCode} for text: ${text}`);
        res.on('data', d => console.error(d.toString()));
        return resolve();
      }
      
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Generated: ${outputPath}`);
        resolve();
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function run() {
  const audioDir = path.join(__dirname, 'assets', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  for (const [storyId, story] of Object.entries(STORY_PANELS)) {
    for (let i = 0; i < story.panels.length; i++) {
      const panel = story.panels[i];
      let voiceId = VOICE_MAP[panel.speaker] || VOICE_MAP['Narrator'];
      if (panel.speaker === HERO_NAME) voiceId = VOICE_MAP['Aiden'];
      
      const outputPath = path.join(audioDir, `story_${storyId}_${i}.mp3`);
      if (!fs.existsSync(outputPath)) {
        await generateSpeech(panel.text, voiceId, outputPath);
      } else {
        console.log(`Skipping ${outputPath}, already exists.`);
      }
    }
  }
  console.log('All audio generated.');
}

run().catch(console.error);
