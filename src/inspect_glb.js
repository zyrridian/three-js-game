const fs = require('fs');

// We will just read the GLB file. GLB is binary but the JSON chunk is plain text.
const buffer = fs.readFileSync('d:/graphic_programming/src/exam-end/models/MapDungeon.glb');

// GLB header: magic (4), version (4), length (4)
const magic = buffer.readUInt32LE(0);
if (magic !== 0x46546C67) {
    console.log("Not a valid GLB");
    process.exit(1);
}

// Chunk 0: JSON chunk
const chunk0Len = buffer.readUInt32LE(12);
const chunk0Type = buffer.readUInt32LE(16);
if (chunk0Type !== 0x4E4F534A) {
    console.log("First chunk is not JSON");
    process.exit(1);
}

const jsonBuffer = buffer.slice(20, 20 + chunk0Len);
const jsonString = jsonBuffer.toString('utf8');
const gltf = JSON.parse(jsonString);

console.log("Nodes:");
gltf.nodes.forEach((node, idx) => {
    if (node.name) {
        console.log(`- ${idx}: ${node.name} (Translation: ${node.translation || '[0,0,0]'}, Scale: ${node.scale || '[1,1,1]'})`);
    }
});
