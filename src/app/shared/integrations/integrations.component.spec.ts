import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { IntegrationsComponent } from './integrations.component';
import { APP_CONFIG } from 'src/app/app-config.module';
import { JiraService } from 'src/app/services/jira.service';
import { LinearService } from 'src/app/services/linear.service';
import { SlackService } from 'src/app/services/slack.service';
import { ToastService } from 'src/app/services/toast.service';

const mockConfig = { runningIn: 'web' };

function buildProviders(jiraValue: any = null, linearValue: any = null, slackValue: any = null) {
  return [
    { provide: APP_CONFIG, useValue: mockConfig },
    {
      provide: JiraService,
      useValue: {
        getIntegration: () => of(jiraValue),
        startJiraAuthFlow: jasmine.createSpy(),
        updateJiraResourceList: () => of(null),
        removeJiraIntegration: () => of(null),
      },
    },
    {
      provide: LinearService,
      useValue: {
        getIntegration: () => of(linearValue),
        startLinearAuthFlow: jasmine.createSpy(),
        removeLinearIntegration: () => of(null),
      },
    },
    {
      provide: SlackService,
      useValue: {
        getIntegration: () => of(slackValue),
        startSlackAuthFlow: jasmine.createSpy(),
        removeSlackIntegration: () => of(null),
      },
    },
    { provide: ToastService, useValue: { showMessage: jasmine.createSpy() } },
    { provide: MatDialogRef, useValue: {} },
    { provide: MAT_DIALOG_DATA, useValue: {} },
  ];
}

// ---------------------------------------------------------------------------
// IMP-022: integration benefit bullets shown/hidden based on connection state
// ---------------------------------------------------------------------------
describe('IMP-022: integration benefit bullets', () => {
  it('jiraIntegration$ emits null when not connected', async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(null, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let jiraValue: any = 'not-set';
    component.jiraIntegration$.subscribe(v => (jiraValue = v));
    expect(jiraValue).toBeNull();
  });

  it('jiraIntegration$ emits integration when connected', async () => {
    const fakeJira = { provider: 'jira', jiraResources: [] };
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(fakeJira, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let jiraValue: any = null;
    component.jiraIntegration$.subscribe(v => (jiraValue = v));
    expect(jiraValue).toEqual(fakeJira);
  });

  it('linearIntegration$ emits null when not connected', async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(null, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let linearValue: any = 'not-set';
    component.linearIntegration$.subscribe(v => (linearValue = v));
    expect(linearValue).toBeNull();
  });

  it('linearIntegration$ emits integration when connected', async () => {
    const fakeLinear = { provider: 'linear' };
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(null, fakeLinear, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let linearValue: any = null;
    component.linearIntegration$.subscribe(v => (linearValue = v));
    expect(linearValue).toEqual(fakeLinear);
  });
});
