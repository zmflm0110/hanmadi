// 사용성 평가(1단계)용 상황 과제. 문장을 직접 보여 주지 않고 '상황'만 준다(정답 문장을 따라 누르지 않게).
// expect: 뜻이 맞게 전달됐다고 볼 문장(느슨한 비교). 판정은 참고용이고, 최종 판정은 평가자가 기록을 보고 한다.
import type { Speech } from '../engine/predicate';

export interface Task {
  id: string;
  prompt: string;
  speech: Speech;
  expect: RegExp;
}

export const TASKS: Task[] = [
  { id: 't01', prompt: '목이 말라요. 선생님께 물을 달라고 해 보세요.', speech: 'polite', expect: /물.*주세요/ },
  { id: 't02', prompt: '화장실에 가고 싶어요. 선생님께 말해 보세요.', speech: 'polite', expect: /화장실.*(가고 싶어요|갈래요|가도)/ },
  { id: 't03', prompt: '배가 아파요. 엄마에게 알려 보세요.', speech: 'plain', expect: /배.*아파/ },
  { id: 't04', prompt: '친구에게 같이 놀자고 해 보세요.', speech: 'plain', expect: /(같이 놀자|놀자)/ },
  { id: 't05', prompt: '할머니께 식사하시라고 말씀드려 보세요.', speech: 'polite', expect: /(진지|밥).*(드세요|드실래요|먹으세요)/ },
  { id: 't06', prompt: '어제 공원에 갔던 일을 말해 보세요.', speech: 'polite', expect: /어제.*공원.*갔어요/ },
  { id: 't07', prompt: '간식을 더 먹고 싶어요.', speech: 'polite', expect: /간식.*(더|먹고 싶어요|주세요)/ },
  { id: 't08', prompt: '미술 활동을 그만하고 싶어요.', speech: 'polite', expect: /(미술|그만).*(그만|싶어요|할래요)/ },
  { id: 't09', prompt: '친구에게 뭐 먹고 싶은지 물어보세요.', speech: 'plain', expect: /뭐.*먹(고 싶어|을래)\?/ },
  { id: 't10', prompt: '선생님께 책을 읽어 달라고 해 보세요.', speech: 'polite', expect: /책.*읽어 주세요/ },
  { id: 't11', prompt: '내일 버스를 탈 거라고 말해 보세요.', speech: 'polite', expect: /내일.*버스.*(탈 거예요|타요)/ },
  { id: 't12', prompt: '텔레비전을 끄지 말라고 해 보세요.', speech: 'polite', expect: /텔레비전.*끄지 마/ },
];

/** 참가자 코드로 조건 순서를 정한다(짝수 코드는 문법 켬 먼저, 홀수는 끔 먼저): 순서 효과 상쇄 */
export function conditionFor(code: string, index: number): boolean {
  const n = Number(code.replace(/\D/g, '')) || 0;
  const firstHalf = index < TASKS.length / 2;
  const grammarFirst = n % 2 === 0;
  return firstHalf ? grammarFirst : !grammarFirst;
}
