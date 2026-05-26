/* ========================================
   LUME COMPILER - Fake Speech-to-Code parser
   ======================================== */

function executeLumeCommand() {
  const inputEl = document.getElementById('lume-input');
  const termOut = document.getElementById('lume-terminal-output');
  const visualOut = document.getElementById('lume-visual-output');
  const canvasContainer = document.getElementById('lume-canvas-container');
  
  if (!inputEl || !termOut || !visualOut) return;

  const cmd = inputEl.value.trim();
  if (cmd === '') return;

  // Print command to terminal
  termOut.innerHTML += `<div style="color:#fbbf24;">&gt; ${cmd}</div>`;
  inputEl.value = '';

  // Parse Intent
  let response = '';
  let visualHtml = '';

  const cmdLower = cmd.toLowerCase();

  // Basic Commands
  if (cmdLower === 'help') {
    response = "Available Commands: <br> - lume.spawn('hero') <br> - lume.spawn('enemy') <br> - lume.signTransaction() <br> - clear";
  } 
  else if (cmdLower === 'clear') {
    termOut.innerHTML = '<div>[SYS] Terminal cleared.</div>';
    visualOut.innerHTML = '<div style="font-size:48px; opacity:0.3; animation:pulse 2s infinite;">🌐</div><div style="color:#64748b; font-family:monospace; margin-top:10px;">Awaiting intent...</div>';
    return;
  }
  else if (cmdLower.includes("lume.spawn('hero')") || cmdLower.includes('lume.spawn("hero")')) {
    response = "[SYS] Compiling intent... Object 'HERO' instantiated.";
    visualHtml = `
      <img src="assets/spider_hero.png" style="height:150px; animation: bounceIn 0.5s ease-out;">
      <div style="color:#34d399; font-weight:bold; margin-top:10px;">Entity: Hero</div>
    `;
  }
  else if (cmdLower.includes("lume.spawn('enemy')") || cmdLower.includes('lume.spawn("enemy")')) {
    response = "[SYS] Compiling intent... Object 'ENEMY' instantiated.";
    visualHtml = `
      <img src="assets/enemies/thug.png" style="height:150px; animation: bounceIn 0.5s ease-out;">
      <div style="color:#ef4444; font-weight:bold; margin-top:10px;">Entity: Thug</div>
    `;
  }
  else if (cmdLower.includes("lume.signtransaction()")) {
    const fakeHash = '0x' + Math.random().toString(16).substr(2, 40);
    response = `[SYS] Payload signed. <br>[HASH] ${fakeHash}`;
    visualHtml = `
      <div style="font-size:64px; color:#fbbf24;">🔐</div>
      <div style="color:#fbbf24; font-weight:bold; margin-top:10px; font-size:12px; word-break:break-all;">Verified:<br>${fakeHash}</div>
    `;
  }
  else {
    response = `<span style="color:#ef4444;">[ERR] Syntax Error. Unrecognized intent: '${cmd}'. Type 'help' for available commands.</span>`;
  }

  // Print response
  termOut.innerHTML += `<div>${response}</div>`;
  
  // Auto-scroll terminal
  termOut.scrollTop = termOut.scrollHeight;

  // Render visual if changed
  if (visualHtml !== '') {
    visualOut.innerHTML = visualHtml;
    // Add simple pop animation to container
    canvasContainer.style.transform = 'scale(0.95)';
    setTimeout(() => { canvasContainer.style.transform = 'scale(1)'; }, 100);
  }
}

// Add CSS for bounceIn animation to the document if not present
const style = document.createElement('style');
style.innerHTML = `
  @keyframes bounceIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

// Expose globally
window.executeLumeCommand = executeLumeCommand;
