import { SOUNDS } from './sounds.js';
import { SCORES, scoreProject } from './scores.js';
import { renderSound } from './sfx-renderer.js';
import { renderScore } from './score-renderer.js';
import { encodeWav, stats } from './pcm.js';

self.onmessage = ({ data }) => {
  try {
    const { id, type, take = 0, trackId = null } = data;
    const item = (type === 'sfx' ? SOUNDS : SCORES).find(x => x.id === id);
    if (!item) throw new Error('Unknown library item');
    const buffer = type === 'sfx' ? renderSound({ ...item, recipe: { ...item.recipe, ...(data.recipe || {}) } }, { take }) : renderScore(scoreProject(item), { trackId, master: !trackId, onProgress: p => self.postMessage({ progress: p }) });
    const bytes = encodeWav(buffer, 24);
    self.postMessage({ bytes, stats: stats(buffer) }, [bytes.buffer]);
  } catch (error) { self.postMessage({ error: error.message }); }
};
