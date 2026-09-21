// 조사 이형태 고르기: 앞말 받침에 따라 은/는, 이/가, 을/를 … 을 고른다.
import { finalJong } from './hangul';

/** [받침 있을 때, 받침 없을 때] */
const PAIRS: Record<string, readonly [string, string]> = {
  '은/는': ['은', '는'],
  '이/가': ['이', '가'],
  '을/를': ['을', '를'],
  '과/와': ['과', '와'],
  '이랑/랑': ['이랑', '랑'],
  '이나/나': ['이나', '나'],
  '이야/야': ['이야', '야'],
  '아/야': ['아', '야'], // 부르는 말: 지민아, 민수야
  '이에요/예요': ['이에요', '예요'],
  '이었어요/였어요': ['이었어요', '였어요'],
  '이라도/라도': ['이라도', '라도'],
  '이라고/라고': ['이라고', '라고'],
  '이든지/든지': ['이든지', '든지'],
  '이며/며': ['이며', '며'],
  '이고/고': ['이고', '고'],
};

const ALIASES = new Map<string, string>();
for (const [key, [a, b]] of Object.entries(PAIRS)) {
  ALIASES.set(key, key);
  ALIASES.set(`${b}/${a}`, key);
  // 한쪽만 적어도 짝을 찾는다. '이'·'아'처럼 겹치는 한 글자는 제외.
  if (a !== '이' && a !== '아') ALIASES.set(a, key);
  if (b !== '야') ALIASES.set(b, key);
}
ALIASES.set('이', '이/가');
ALIASES.set('야', '아/야');
for (const alias of ['으로/로', '로/으로', '으로', '로']) ALIASES.set(alias, '으로/로');

export type JosaForm = string;

/** 앞말에 맞는 조사 형태만 돌려준다. 받침을 알 수 없으면 두 형태를 괄호로 함께 쓴다. */
export function josaFor(word: string, josa: string): JosaForm {
  const key = ALIASES.get(josa);
  if (!key) return josa; // 에, 에서, 에게, 도, 만 … 모양이 바뀌지 않는 조사
  const jong = finalJong(word);
  if (key === '으로/로') {
    if (jong === null) return '(으)로';
    return jong === '' || jong === 'ㄹ' ? '로' : '으로';
  }
  const [withBatchim, without] = PAIRS[key]!;
  if (jong === null) return `${withBatchim}(${without})`;
  return jong === '' ? without : withBatchim;
}

export function attachJosa(word: string, josa: string): string {
  return word + josaFor(word, josa);
}
