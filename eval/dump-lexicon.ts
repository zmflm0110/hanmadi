// 평가 파이프라인(Python)이 쓰도록 사전을 JSON 으로 내보낸다.
import { writeFileSync } from 'node:fs';
import { CORE } from '../src/data/core';

writeFileSync(new URL('./data/lexicon.json', import.meta.url), JSON.stringify(CORE, null, 1));
console.log(`사전 ${CORE.length}개 → eval/data/lexicon.json`);
