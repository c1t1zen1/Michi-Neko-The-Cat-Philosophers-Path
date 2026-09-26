const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj', '.stl', '.ply', '.dae', '.3ds']);
const ENVIRONMENT_EXTENSIONS = new Set(['.hdr', '.exr']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

export function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

export function slugify(value) {
  return String(value || 'item')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'item';
}

export function extensionOf(filePath) {
  const clean = normalizePath(filePath).split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot).toLowerCase() : '';
}

export function classifyFile(filePath) {
  const ext = extensionOf(filePath);
  if (SOURCE_EXTENSIONS.has(ext)) return 'source';
  if (MODEL_EXTENSIONS.has(ext)) return 'model';
  if (ENVIRONMENT_EXTENSIONS.has(ext)) return 'environment';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'other';
}

export function extractSourceMetadata(source, filePath = '') {
  const text = String(source || '');
  const classes = [...text.matchAll(/export\s+class\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  const builders = [...new Set([...text.matchAll(/(?:^[ \t]*export\s+(?:async\s+)?function\s+|^[ \t]+)(build|create|make|generate|add)([A-Z][A-Za-z0-9_$]*)\s*\(/gm)]
    .map((match) => `${match[1]}${match[2]}`))];
  const geometries = [...new Set([...text.matchAll(/new\s+THREE\.([A-Za-z0-9_$]+Geometry)\s*\(/g)].map((match) => match[1]))];
  const materials = [...new Set([...text.matchAll(/new\s+THREE\.([A-Za-z0-9_$]+Material)\s*\(/g)].map((match) => match[1]))];
  const objectTypes = [...new Set([...text.matchAll(/new\s+THREE\.(Mesh|Group|InstancedMesh|Sprite|Points|Line|PerspectiveCamera|OrthographicCamera|[A-Za-z]+Light)\s*\(/g)].map((match) => match[1]))];
  const importsThree = /from\s+['"]three(?:\/addons\/[^'"]*)?['"]|THREE\./.test(text);
  return {
    file: normalizePath(filePath),
    classes,
    builders,
    geometries,
    materials,
    objectTypes,
    importsThree
  };
}

export function sourceEntries(metadata) {
  const entries = [];
  for (const className of metadata.classes || []) {
    entries.push({
      id: `class:${metadata.file}:${className}`,
      kind: 'class',
      category: categoryForName(className, metadata.file),
      label: splitLabel(className),
      symbol: className,
      file: metadata.file
    });
  }
  for (const builder of metadata.builders || []) {
    const label = builder.replace(/^(build|create|make|generate|add)/, '');
    entries.push({
      id: `builder:${metadata.file}:${builder}`,
      kind: 'builder',
      category: categoryForName(label, metadata.file),
      label: splitLabel(label),
      symbol: builder,
      file: metadata.file
    });
  }
  return entries;
}

export function splitLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function categoryForName(name, filePath = '') {
  const value = `${name} ${filePath}`.toLowerCase();
  if (/cat|player|npc|character|luna|mochi|kuro/.test(value)) return 'Characters';
  if (/sky|cloud|star|moon|sun|weather|particle|rain|snow|fog|light/.test(value)) return 'Atmosphere';
  if (/tree|grass|flower|bamboo|vegetation|maple|pine|sakura|susuki/.test(value)) return 'Vegetation';
  if (/interior|room|tatami|shoji|table|bonsai|tea/.test(value)) return 'Interiors';
  if (/camera/.test(value)) return 'Cameras';
  if (/texture|image|reference/.test(value)) return 'References';
  return 'Environment';
}

export function fingerprintDescriptor(descriptor) {
  const parts = [
    descriptor.source || 'runtime',
    descriptor.path || descriptor.file || '',
    descriptor.type || descriptor.kind || '',
    descriptor.geometry || '',
    descriptor.material || '',
    descriptor.name || descriptor.label || ''
  ];
  return slugify(parts.filter(Boolean).join('__'));
}

export function createCatalog(files, readSource) {
  const catalog = { generatedAt: new Date().toISOString(), files: [], sources: [], entries: [], stats: {} };
  for (const rawPath of files) {
    const file = normalizePath(rawPath);
    const kind = classifyFile(file);
    if (kind === 'other') continue;
    catalog.files.push({ path: file, kind, extension: extensionOf(file) });
    if (kind === 'source') {
      const source = readSource(file);
      const metadata = extractSourceMetadata(source, file);
      if (metadata.importsThree) {
        catalog.sources.push(metadata);
        catalog.entries.push(...sourceEntries(metadata));
      }
    } else {
      const base = file.split('/').pop().replace(/\.[^.]+$/, '');
      catalog.entries.push({
        id: `${kind}:${file}`,
        kind,
        category: kind === 'image' ? 'References' : kind === 'environment' ? 'Atmosphere' : 'Imported Models',
        label: splitLabel(base),
        file
      });
    }
  }
  catalog.entries.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  catalog.stats = {
    files: catalog.files.length,
    sources: catalog.sources.length,
    entries: catalog.entries.length,
    models: catalog.files.filter((file) => file.kind === 'model').length,
    images: catalog.files.filter((file) => file.kind === 'image').length
  };
  return catalog;
}