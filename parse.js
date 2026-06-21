const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'QuickShare_2606211040');
const files = fs.readdirSync(targetDir);
const mdFiles = files.filter(f => f.endsWith('.md'));

const nodes = [];
const edges = [];
const nodeMap = new Map();

// Helper to clean up link names or resolve them to file names
function resolveTarget(linkText) {
    // Obsidian links might contain a display name: [[LinkName|DisplayName]] or anchor [[LinkName#Anchor]]
    let target = linkText.split('|')[0].split('#')[0].trim();
    return target;
}

// First pass: register all nodes with their actual file names, group, summary, and content
mdFiles.forEach(file => {
    const name = path.basename(file, '.md');
    const filePath = path.join(targetDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract first 2 non-empty lines for summary
    const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const summary = lines.slice(0, 2).join('\n');
    
    nodeMap.set(name, {
        id: name,
        label: name,
        group: 'QuickShare_2606211040',
        summary: summary,
        content: content,
        exists: true,
        filePath: path.join('QuickShare_2606211040', file)
    });
});

// Second pass: read files and extract edges
mdFiles.forEach(file => {
    const sourceName = path.basename(file, '.md');
    const filePath = path.join(targetDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex for [[Link]]
    const regex = /\[\[(.*?)\]\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const rawTarget = match[1];
        const targetName = resolveTarget(rawTarget);
        
        if (targetName) {
            // Register target in map if it doesn't exist (e.g. linked but file doesn't exist)
            if (!nodeMap.has(targetName)) {
                nodeMap.set(targetName, {
                    id: targetName,
                    label: targetName,
                    group: 'external',
                    summary: '외부 노드 (파일 없음)',
                    content: '이 노드는 다른 파일에서 링크로 참조되었지만, 실제 마크다운 파일이 존재하지 않는 외부 노드입니다.',
                    exists: false
                });
            }
            
            edges.push({
                source: sourceName,
                target: targetName
            });
        }
    }
});

const result = {
    nodes: Array.from(nodeMap.values()),
    edges: edges
};

fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(result, null, 2), 'utf-8');
console.log("Successfully saved data.json in UTF-8 with group and summary!");


