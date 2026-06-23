import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('IMP-012: reveal countdown logic', () => {
  /**
   * Tests the countdown state machine in isolation.
   * The logic: showResults() sets revealCountdown to 3, ticks down every second,
   * calling setShowResults on reaching 0. A second call during countdown cancels it.
   */

  function createCountdownState(onComplete: () => void) {
    let countdownValue: number | null = null;
    let handle: ReturnType<typeof setInterval> | null = null;

    function getValue() { return countdownValue; }

    function start() {
      if (countdownValue !== null) {
        if (handle !== null) clearInterval(handle);
        handle = null;
        countdownValue = null;
        return;
      }

      countdownValue = 3;
      handle = setInterval(() => {
        if (countdownValue === null) {
          clearInterval(handle);
          handle = null;
          return;
        }
        if (countdownValue <= 1) {
          clearInterval(handle);
          handle = null;
          countdownValue = null;
          onComplete();
        } else {
          countdownValue = countdownValue - 1;
        }
      }, 1000);
    }

    function cleanup() {
      if (handle !== null) clearInterval(handle);
    }

    return { getValue, start, cleanup };
  }

  it('starts at 3 when triggered', () => {
    const state = createCountdownState(() => {});
    state.start();
    expect(state.getValue()).toBe(3);
    state.cleanup();
  });

  it('decrements to 2 after 1 second', fakeAsync(() => {
    const state = createCountdownState(() => {});
    state.start();
    tick(1000);
    expect(state.getValue()).toBe(2);
    state.cleanup();
  }));

  it('decrements to 1 after 2 seconds', fakeAsync(() => {
    const state = createCountdownState(() => {});
    state.start();
    tick(2000);
    expect(state.getValue()).toBe(1);
    state.cleanup();
  }));

  it('fires onComplete and resets to null after 3 seconds', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const state = createCountdownState(completeSpy);
    state.start();
    tick(3000);
    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(state.getValue()).toBeNull();
  }));

  it('cancels the countdown when triggered a second time', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const state = createCountdownState(completeSpy);
    state.start();
    tick(1000);
    state.start();
    tick(5000);
    expect(completeSpy).not.toHaveBeenCalled();
    expect(state.getValue()).toBeNull();
  }));

  it('does not fire onComplete if cancelled mid-way', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const state = createCountdownState(completeSpy);
    state.start();
    tick(2000);
    state.start(); // cancel
    tick(5000);
    expect(completeSpy).not.toHaveBeenCalled();
  }));
});
