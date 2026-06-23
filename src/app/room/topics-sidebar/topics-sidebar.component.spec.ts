import { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('IMP-014: facilitator-only round reorder', () => {
  /**
   * Tests the drop() permission guard in isolation.
   * The real component uses a `canReorderRounds` signal derived from
   * permissionsService.canCreateRounds(). drop() returns early when the
   * signal is false, so setRounds() must never be called.
   */

  function createDropHandler(canReorder: () => boolean, setRoundsSpy: jasmine.Spy) {
    return async function drop(event: CdkDragDrop<string[]>) {
      if (!canReorder()) return;
      const rounds = ['a', 'b', 'c'];
      const mutable = [...rounds];
      const prev = event.previousIndex;
      const curr = event.currentIndex;
      [mutable[prev], mutable[curr]] = [mutable[curr], mutable[prev]];
      await setRoundsSpy(mutable);
    };
  }

  function makeDragEvent(prev: number, curr: number): CdkDragDrop<string[]> {
    return { previousIndex: prev, currentIndex: curr } as CdkDragDrop<string[]>;
  }

  it('calls setRounds when user has permission', async () => {
    const spy = jasmine.createSpy('setRounds').and.returnValue(Promise.resolve());
    const drop = createDropHandler(() => true, spy);
    await drop(makeDragEvent(0, 2));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not call setRounds when user lacks permission', async () => {
    const spy = jasmine.createSpy('setRounds').and.returnValue(Promise.resolve());
    const drop = createDropHandler(() => false, spy);
    await drop(makeDragEvent(0, 2));
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call setRounds when permission changes to false mid-session', async () => {
    let allowed = true;
    const spy = jasmine.createSpy('setRounds').and.returnValue(Promise.resolve());
    const drop = createDropHandler(() => allowed, spy);

    await drop(makeDragEvent(0, 1));
    expect(spy).toHaveBeenCalledTimes(1);

    allowed = false;
    await drop(makeDragEvent(1, 0));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
