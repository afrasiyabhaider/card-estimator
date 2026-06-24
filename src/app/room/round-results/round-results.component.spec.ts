import { signal } from '@angular/core';
import { Member, MemberType, Room } from 'src/app/types';
import { RoundResultsComponent } from './round-results.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMember(id: string, type = MemberType.ESTIMATOR): Member {
  return { id, name: id, type, isAnonymous: false, status: 'online' } as Member;
}

function buildComp(members: Member[], estimates: Record<string, number> = {}) {
  const comp = Object.create(RoundResultsComponent.prototype) as RoundResultsComponent;
  comp.membersSignal = signal(members) as any;
  comp.votesCollapsed = signal(true) as any;
  comp.currentRound = signal(0) as any;
  const room = { rounds: { 0: { show_results: false, estimates } } } as unknown as Room;
  comp.room = signal(room) as any;
  return comp;
}

// ---------------------------------------------------------------------------
// IMP-021: mobile member collapse
// ---------------------------------------------------------------------------
describe('IMP-021: votedCount / estimatorCount / votesCollapsed', () => {
  it('estimatorCount counts only ESTIMATOR members', () => {
    const members = [
      makeMember('a', MemberType.ESTIMATOR),
      makeMember('b', MemberType.ESTIMATOR),
      makeMember('c', MemberType.OBSERVER),
    ];
    const comp = buildComp(members);
    expect(comp.estimatorCount()).toBe(2);
  });

  it('votedCount counts estimators who have a defined estimate', () => {
    const members = [
      makeMember('a', MemberType.ESTIMATOR),
      makeMember('b', MemberType.ESTIMATOR),
      makeMember('c', MemberType.ESTIMATOR),
    ];
    const comp = buildComp(members, { a: 3, b: 5 });
    expect(comp.votedCount()).toBe(2);
  });

  it('votedCount ignores observers even when they have an estimate', () => {
    const members = [
      makeMember('a', MemberType.ESTIMATOR),
      makeMember('obs', MemberType.OBSERVER),
    ];
    const comp = buildComp(members, { a: 3, obs: 1 });
    expect(comp.votedCount()).toBe(1);
  });

  it('votedCount is 0 when no votes cast', () => {
    const members = [makeMember('a'), makeMember('b')];
    const comp = buildComp(members);
    expect(comp.votedCount()).toBe(0);
  });

  it('votesCollapsed starts as true', () => {
    const comp = buildComp([]);
    expect(comp.votesCollapsed()).toBe(true);
  });

  it('setting votesCollapsed to false expands the list', () => {
    const comp = buildComp([]);
    (comp.votesCollapsed as any).set(false);
    expect(comp.votesCollapsed()).toBe(false);
  });

  it('estimatorCount is 0 with empty members list', () => {
    const comp = buildComp([]);
    expect(comp.estimatorCount()).toBe(0);
  });
});
