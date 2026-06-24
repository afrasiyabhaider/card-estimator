import { Injectable } from '@angular/core';
import {
  Observable,
  map,
  switchMap,
  filter,
  BehaviorSubject,
  distinctUntilChanged,
  combineLatest,
  withLatestFrom,
  Subscription,
  catchError,
  EMPTY,
  timer,
} from 'rxjs';
import {
  CardSet,
  CardSetValue,
  DEFAULT_ROOM_CONFIGURATION,
  Member,
  MemberStatus,
  RichTopic,
  Room,
  Round,
  UserProfileMap,
} from '../types';
import {
  EstimatorService,
  NotLoggedInError,
} from '../services/estimator.service';
import { isEqual } from 'lodash';
import { AuthService } from '../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { roomAuthenticationModalCreator } from '../shared/room-authentication-modal/room-authentication-modal.component';
import { ToastService } from '../services/toast.service';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';

@Injectable({
  providedIn: 'root',
})
export class RoomDataService {
  roomSubject = new BehaviorSubject<Room | undefined>(undefined);
  loadError = new BehaviorSubject<string | null>(null);

  room$: Observable<Room> = this.roomSubject.pipe(
    filter(room => !!room?.rounds)
  );

  localActiveRound = new BehaviorSubject<number | undefined>(undefined);

  roomRoundNumber$ = this.room$.pipe(
    map(room => room.currentRound ?? 0),
    distinctUntilChanged()
  );

  currentRoundNumber$: Observable<number> = combineLatest([
    this.room$,
    this.roomRoundNumber$,
    this.localActiveRound,
  ]).pipe(
    map(
      ([room, roomActiveRound, localActiveRound]) =>
        (room.isAsyncVotingEnabled ? localActiveRound : undefined) ??
        roomActiveRound
    ),
    distinctUntilChanged()
  );

  activeRound$: Observable<Round> = combineLatest([
    this.room$,
    this.currentRoundNumber$,
  ]).pipe(
    map(([room, roundNumber]) => room.rounds[roundNumber]),
    filter(round => !!round?.estimates),
    distinctUntilChanged(isEqual)
  );

  roomTopic$: Observable<{ topic: string; richTopic?: RichTopic | null }> =
    this.activeRound$.pipe(
      map(activeRound => {
        return {
          topic: activeRound?.topic || '',
          richTopic: activeRound?.richTopic,
        };
      }),
      distinctUntilChanged(isEqual)
    );

  activeMembers$: Observable<Member[]> = this.room$.pipe(
    map(room => [room.members, room.memberIds]),
    distinctUntilChanged<[Member[], string[]]>(isEqual),
    map(([members, memberIds]) =>
      members
        .filter(
          m =>
            (m.status === MemberStatus.ACTIVE || m.status === undefined) &&
            memberIds.includes(m.id)
        )
        .sort((a, b) => a.type?.localeCompare(b.type))
    )
  );

  activeMembersAnonymized$: Observable<
    Array<Member & { isAnonymous: boolean }>
  > = combineLatest([
    this.room$.pipe(
      map(room => room.isAnonymousVotingEnabled),
      distinctUntilChanged()
    ),
    this.activeMembers$,
  ]).pipe(
    map(([isAnonymous, members]) => {
      if (!isAnonymous) {
        return members.map(member => ({ ...member, isAnonymous }));
      }

      return members
        .map(member => ({
          ...member,
          name: 'Anonymous User',
          avatarUrl: '',
          isAnonymous,
        }))
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    })
  );

  activeMember$: Observable<Member> = combineLatest([
    this.room$.pipe(map(room => room.members)),
    this.authService.user,
  ]).pipe(
    filter(([_members, user]) => !!user),
    map(([members, user]) => members.find(m => m.id === user.uid)),
    distinctUntilChanged(isEqual)
  );

  isRoomCreator$: Observable<boolean> = combineLatest([
    this.authService.user,
    this.room$,
  ]).pipe(
    map(([user, room]) => user?.uid === room?.createdById),
    distinctUntilChanged()
  );

  userProfiles$: Observable<UserProfileMap> = this.activeMembers$.pipe(
    distinctUntilChanged(isEqual),
    switchMap(members =>
      this.authService.getUserProfiles(members?.map(m => m.id) ?? [])
    )
  );

  /* Events */
  onEstimatesUpdated$ = this.activeRound$.pipe(
    map(round => round.estimates),
    distinctUntilChanged(isEqual)
  );

  onCardSetUpdated$: Observable<
    [CardSet | 'CUSTOM', CardSetValue | undefined]
  > = this.room$.pipe(
    map(room => [room.cardSet, room.customCardSetValue]),
    distinctUntilChanged<[CardSet, CardSetValue]>(isEqual)
  );

  onNameUpdated$: Observable<string> = this.authService.nameUpdated.pipe(
    distinctUntilChanged()
  );

  onPermissionsUpdated$ = this.room$.pipe(
    map(room => {
      return {
        permissions:
          room.configuration?.permissions ||
          DEFAULT_ROOM_CONFIGURATION.permissions,
      };
    }),
    distinctUntilChanged(isEqual),
    withLatestFrom(this.room$)
  );

  onRoomRoundCountUpdated$ = this.room$.pipe(
    map(room => Object.keys(room.rounds).length),
    distinctUntilChanged()
  );

  roomSubscription: Subscription;
  private loadTimeoutSub: Subscription | null = null;

  constructor(
    private readonly estimatorService: EstimatorService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly toastService: ToastService,
    private readonly confirmDialogService: ConfirmDialogService
  ) {}

  loadRoom(roomId: string, startWithRoom?: Room) {
    this.loadError.next(null);
    this.loadTimeoutSub?.unsubscribe();

    if (startWithRoom) {
      this.roomSubject.next(startWithRoom);
    }

    this.loadTimeoutSub = timer(10000).subscribe(() => {
      if (!this.roomSubject.value?.rounds) {
        this.loadError.next(
          'The room could not be loaded. Check your connection and try again.'
        );
      }
    });

    this.roomSubscription = this.estimatorService
      .getRoomById(roomId)
      .pipe(
        catchError(error => {
          this.loadTimeoutSub?.unsubscribe();
          return this.onRoomUpdateError(error);
        })
      )
      .subscribe(room => {
        this.loadTimeoutSub?.unsubscribe();
        this.loadError.next(null);
        if (this.localActiveRound.value === undefined) {
          this.localActiveRound.next(room.currentRound ?? 0);
        }
        this.roomSubject.next(room);
      });
  }

  leaveRoom() {
    this.roomSubject.next(undefined);
    this.localActiveRound.next(undefined);
    this.loadError.next(null);
    this.loadTimeoutSub?.unsubscribe();
    this.roomSubscription.unsubscribe();
  }

  private onRoomUpdateError(error: any): Observable<any> {
    if (error?.code === 'permission-denied') {
      return this.dialog
        .open(
          ...roomAuthenticationModalCreator({
            roomId: this.roomSubject.value.roomId,
          })
        )
        .afterClosed()
        .pipe(
          switchMap(result => {
            if (result && result?.joined) {
              return this.estimatorService.getRoomById(
                this.roomSubject.value.roomId
              );
            } else {
              this.errorGoBackToJoinPage({});
              return EMPTY;
            }
          })
        );
    } else {
      const message =
        error instanceof NotLoggedInError
          ? "You've been signed out"
          : undefined;
      this.errorGoBackToJoinPage({ message });
      return EMPTY;
    }
  }

  private errorGoBackToJoinPage({
    message = 'Something went wrong. Please try again later.',
  }: {
    message?: string;
    duration?: number | null;
  }) {
    this.toastService.showMessage(message);
    this.router.navigate(['join'], {});
  }
}
