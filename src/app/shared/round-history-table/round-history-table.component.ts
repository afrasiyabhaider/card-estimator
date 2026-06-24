import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FieldValue, Timestamp } from 'firebase/firestore';
import {
  BehaviorSubject,
  Observable,
  Subject,
  from,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { EstimatorService } from 'src/app/services/estimator.service';
import { PaymentService } from 'src/app/services/payment.service';
import { ExportData } from 'src/app/services/serializer.service';
import { MatSort } from '@angular/material/sort';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CdkColumnDef } from '@angular/cdk/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest } from 'rxjs';
import { startWith } from 'rxjs/operators';

function checkMatchesFilter(row: TableRow, filter: string): boolean {
  if (!filter) return true;
  try {
    const { text, days } = JSON.parse(filter) as { text: string; days: number };
    const textMatch =
      !text ||
      row.topicName.toLowerCase().includes(text.toLowerCase()) ||
      row.roomId.toLowerCase().includes(text.toLowerCase());
    if (!textMatch) return false;
    if (!days) return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const rowDate = (row.startedAt as Timestamp).toMillis();
    return rowDate >= cutoff.getTime();
  } catch {
    return (
      row.topicName.toLowerCase().includes(filter.toLowerCase()) ||
      row.roomId.toLowerCase().includes(filter.toLowerCase())
    );
  }
}

interface TableRow {
  id: string;
  topicName: string;
  roomId: string;
  startedAt: FieldValue;
  majority: string;
  average: string;
  notes: string;
}

@Component({
  selector: 'planning-poker-round-history-table',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterModule,
  ],
  providers: [CdkColumnDef],
  templateUrl: './round-history-table.component.html',
  styleUrls: ['./round-history-table.component.scss'],
})
export class RoundHistoryTableComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  filter = new FormControl('', { nonNullable: true });
  dateRange = new FormControl<number>(0, { nonNullable: true });

  readonly dateRangeOptions = [
    { label: 'All time', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  displayedColumns: string[] = [
    'topicName',
    'roomId',
    'startedAt',
    'notes',
    'majority',
    'average',
  ];

  isLoading = new BehaviorSubject(true);

  previousRounds: Observable<TableRow[]> = of(undefined).pipe(
    tap(() => this.isLoading.next(true)),
    switchMap(() => this.estimatorService.getPreviousSessions()),
    map(rooms => {
      const rounds = rooms.map(room => {
        const stats = new ExportData(room);
        return stats.rows.map(
          (statRow): TableRow => ({
            id: statRow.roundId,
            topicName: statRow.topic,
            roomId: room.roomId,
            startedAt: statRow.startedAt || Timestamp.now(),
            majority: statRow.mostPopularVoteOrOverride || '-',
            average: statRow.average || '-',
            notes: statRow.notes || '-',
          })
        );
      });
      return rounds
        .flat()
        .sort(
          (a, b) =>
            (b.startedAt as Timestamp).toMillis() -
            (a.startedAt as Timestamp).toMillis()
        );
    }),
    tap(() => this.isLoading.next(false))
  );

  dataSource: MatTableDataSource<TableRow>;

  readonly destroy = new Subject<void>();

  constructor(
    private readonly estimatorService: EstimatorService,
    private readonly paymentsService: PaymentService
  ) {
    this.dataSource = new MatTableDataSource<TableRow>([]);
    this.dataSource.filterPredicate = checkMatchesFilter;
  }

  ngOnInit() {
    this.previousRounds.pipe(takeUntil(this.destroy)).subscribe(rounds => {
      this.dataSource.data = rounds;
    });

    combineLatest([
      this.filter.valueChanges.pipe(startWith('')),
      this.dateRange.valueChanges.pipe(startWith(0)),
    ]).pipe(takeUntil(this.destroy)).subscribe(([text, days]) => {
      this.dataSource.filter = JSON.stringify({ text, days });

      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }
}
