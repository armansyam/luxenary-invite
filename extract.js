const fs = require('fs');
const lines = fs.readFileSync('/Users/armansyam/.gemini/antigravity-ide/brain/0f33d81b-b169-4897-bb78-405098d62bd3/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (const line of lines) {
  if (!line) continue;
  const parsed = JSON.parse(line);
  if (parsed.content && parsed.content.includes('File Path: `file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/page.tsx`')) {
    const outputLines = parsed.content.split('\n');
    let isCode = false;
    for (const outLine of outputLines) {
      if (outLine.match(/^[0-9]+:/)) {
        console.log(outLine);
      }
    }
  }
}
