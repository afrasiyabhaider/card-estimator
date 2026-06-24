import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RoundHistoryTableComponent } from './round-history-table.component';
import { EstimatorService } from 'src/app/services/estimator.service';
import { PaymentService } from 'src/app/services/payment.service';

const mockEstimatorService = {
  getPreviousSessions: () => of([]),
};
const mockPaymentService = {};

function makeRow(topicName: string, roomId: string, millisAgo: number) {
  return {
    id: '1',
    topicName,
    roomId,
    startedAt: { toMillis: () => Date.now() - millisAgo },
    majority: '3',
    average: '3',
    notes: '',
  } as any;
}

describe('RoundHistoryTableComponent', () => {
  let component: RoundHistoryTableComponent;
  let fixture: ComponentFixture<RoundHistoryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RoundHistoryTableComponent,
        RouterModule.forRoot([]),
        NoopAnimationsModule,
      ],
      providers: [
        { provide: EstimatorService, useValue: mockEstimatorService },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoundHistoryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('IMP-016: date range filter', () => {
    it('dateRange defaults to 0 (All time)', () => {
      expect(component.dateRange.value).toBe(0);
    });

    it('dateRangeOptions has 4 entries with correct days values', () => {
      const days = component.dateRangeOptions.map(o => o.days);
      expect(days).toEqual([0, 7, 30, 90]);
    });

    it('filterPredicate matches row when text matches topicName', () => {
      const predicate = component.dataSource.filterPredicate;
      const row = makeRow('User story', 'room-abc', 0);
      expect(predicate(row, JSON.stringify({ text: 'user', days: 0 }))).toBe(true);
    });

    it('filterPredicate matches row when text matches roomId', () => {
      const predicate = component.dataSource.filterPredicate;
      const row = makeRow('Some topic', 'room-xyz', 0);
      expect(predicate(row, JSON.stringify({ text: 'xyz', days: 0 }))).toBe(true);
    });

    it('filterPredicate excludes row when text does not match', () => {
      const predicate = component.dataSource.filterPredicate;
      const row = makeRow('Backend task', 'room-1', 0);
      expect(predicate(row, JSON.stringify({ text: 'frontend', days: 0 }))).toBe(false);
    });

    it('filterPredicate keeps recent row when days=7', () => {
      const predicate = component.dataSource.filterPredicate;
      const row = makeRow('Recent story', 'room-1', 1000 * 60 * 60); // 1 hour ago
      expect(predicate(row, JSON.stringify({ text: '', days: 7 }))).toBe(true);
    });

    it('filterPredicate excludes old row when days=7', () => {
      const predicate = component.dataSource.filterPredicate;
      const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
      const row = makeRow('Old story', 'room-1', eightDaysMs);
      expect(predicate(row, JSON.stringify({ text: '', days: 7 }))).toBe(false);
    });

    it('filterPredicate returns true for empty filter', () => {
      const predicate = component.dataSource.filterPredicate;
      const row = makeRow('Anything', 'room-1', 0);
      expect(predicate(row, '')).toBe(true);
    });
  });
});
