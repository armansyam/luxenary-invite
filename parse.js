const fs = require('fs');
const lines = fs.readFileSync('/Users/armansyam/.gemini/antigravity-ide/brain/0f33d81b-b169-4897-bb78-405098d62bd3/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

let viewFileOutputs = [];
for (const line of lines) {
  if (!line) continue;
  const parsed = JSON.parse(line);
  if (parsed.content && parsed.content.includes('File Path: `file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/page.tsx`')) {
    if (parsed.content.includes('Total Lines: 486')) {
      viewFileOutputs.push(parsed.content);
    }
  }
}

let fileLines = [];
// Apply base file first
const base = fs.readFileSync('app/(client)/dashboard/page.tsx', 'utf8').split('\n');
for (let i=0; i<base.length; i++) {
  fileLines[i+1] = base[i];
}

// Overwrite with whatever we saw in the 486-line file views
for (const output of viewFileOutputs) {
  const outputLines = output.split('\n');
  for (const outLine of outputLines) {
    const match = outLine.match(/^(\d+): (.*)$/);
    if (match) {
      fileLines[parseInt(match[1])] = match[2];
    }
  }
}

// Let's just output the viewFileOutputs to a file so we can read it directly!
fs.writeFileSync('extracted_views.txt', viewFileOutputs.join('\n\n=========================\n\n'));
