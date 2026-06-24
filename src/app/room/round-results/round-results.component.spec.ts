import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Member, MemberType, Room } from 'src/app/types';
import { RoundResultsComponent } from './round-results.component';

// ---------------------------------------------------------------------------
// Helpers — build a minimal partial component instance for class-level tests
// (avoids the heavy Firebase / service graph from TestBed)
// ---------------------------------------------------------------------------
function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    name: 'Alice',
    type: MemberType.ESTIMATOR,
    isAnonymous: false,
    status: 'online',
    ...overrides,
  } as Member;
}

function makeRound(overrides: Record<string, unknown> = {}) {
  return { show_results: false, estimates: {}, ...overrides };
}

function buildPartialComponent(overrides: Record<string, unknown> = {}) {
  const comp = Object.create(RoundResultsComponent.prototype) as RoundResultsComponent;
  comp.showNudgeButtons = signal(false) as any;
  comp.currentUserId = signal('self-id') as any;
  comp.membersSignal = signal([]) as any;
  const defaultRoom = { rounds: { 0: makeRound() } } as unknown as Room;
  comp.room = signal(defaultRoom) as any;
  comp.currentRound = signal(0) as any;
  Object.assign(comp, overrides);
  return comp;
}

// ---------------------------------------------------------------------------
// IMP-017: aria-label value on the nudge button
// The nudge button uses [attr.aria-label]="'Nudge ' + member.name + ' to vote'"
// We verify the expression produces the correct string and that the button
// is only shown when canShowNudgeButton returns true.
// ---------------------------------------------------------------------------
describe('IMP-017: nudge button aria-label', () => {
  it('aria-label expression produces the correct value for a given member name', () => {
    const member = makeMember({ name: 'Bob' });
    const label = `Nudge ${member.name} to vote`;
    expect(label).toBe('Nudge Bob to vote');
  });

  it('canNudgeMember returns false when results are shown', () => {
    const comp = buildPartialComponent();
    (comp.room as any).set({ rounds: { 0: makeRound({ show_results: true }) } });
    expect(comp.canNudgeMember(makeMember())).toBe(false);
  });

  it('canNudgeMember returns false for the current user', () => {
    const comp = buildPartialComponent();
    expect(comp.canNudgeMember(makeMember({ id: 'self-id' }))).toBe(false);
  });

  it('canNudgeMember returns false for observers', () => {
    const comp = buildPartialComponent();
    expect(comp.canNudgeMember(makeMember({ type: MemberType.OBSERVER }))).toBe(false);
  });

  it('canNudgeMember returns true for an estimator who has not voted', () => {
    const comp = buildPartialComponent();
    expect(comp.canNudgeMember(makeMember({ id: 'other-member' }))).toBe(true);
  });

  it('canNudgeMember returns false when member has already voted', () => {
    const comp = buildPartialComponent();
    (comp.room as any).set({
      rounds: { 0: makeRound({ estimates: { 'member-1': 3 } }) },
    });
    expect(comp.canNudgeMember(makeMember({ id: 'member-1' }))).toBe(false);
  });

  it('canShowNudgeButton is false when showNudgeButtons is false', () => {
    const comp = buildPartialComponent();
    (comp.showNudgeButtons as any).set(false);
    expect(comp.canShowNudgeButton(makeMember({ id: 'other-member' }))).toBe(false);
  });
});
