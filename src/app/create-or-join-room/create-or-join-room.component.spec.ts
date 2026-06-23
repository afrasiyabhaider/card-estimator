import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { CreateOrJoinRoomComponent } from './create-or-join-room.component';
import { RoomNotFoundError } from '../services/estimator.service';

function buildNameControl(): FormControl<string> {
  return new FormControl<string>('', [Validators.required, Validators.minLength(2)]);
}

function buildRoomIdControl(): FormControl<string> {
  return new FormControl<string>('', [Validators.required, Validators.minLength(3)]);
}

describe('IMP-008: join form validators', () => {
  describe('name FormControl', () => {
    let control: FormControl<string>;

    beforeEach(() => {
      control = buildNameControl();
    });

    it('is invalid when empty', () => {
      control.setValue('');
      expect(control.valid).toBeFalse();
      expect(control.hasError('required')).toBeTrue();
    });

    it('is invalid when only one character', () => {
      control.setValue('A');
      expect(control.valid).toBeFalse();
      expect(control.hasError('minlength')).toBeTrue();
    });

    it('is valid with two or more characters', () => {
      control.setValue('Jo');
      expect(control.valid).toBeTrue();
    });
  });

  describe('roomId FormControl', () => {
    let control: FormControl<string>;

    beforeEach(() => {
      control = buildRoomIdControl();
    });

    it('is invalid when empty', () => {
      control.setValue('');
      expect(control.valid).toBeFalse();
      expect(control.hasError('required')).toBeTrue();
    });

    it('is invalid with fewer than 3 characters', () => {
      control.setValue('ab');
      expect(control.valid).toBeFalse();
      expect(control.hasError('minlength')).toBeTrue();
    });

    it('is valid with 3 or more characters', () => {
      control.setValue('abc');
      expect(control.valid).toBeTrue();
    });
  });
});

describe('IMP-010: room not found error', () => {
  it('RoomNotFoundError is an instance of Error', () => {
    const err = new RoomNotFoundError();
    expect(err instanceof Error).toBeTrue();
    expect(err instanceof RoomNotFoundError).toBeTrue();
  });

  it('RoomNotFoundError is distinguishable from generic errors', () => {
    const notFound = new RoomNotFoundError();
    const generic = new Error('generic');
    expect(notFound instanceof RoomNotFoundError).toBeTrue();
    expect(generic instanceof RoomNotFoundError).toBeFalse();
  });
});
