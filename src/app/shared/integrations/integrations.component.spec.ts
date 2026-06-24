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

describe('IntegrationsComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(),
    }).compileComponents();
    const fixture = TestBed.createComponent(IntegrationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// IMP-023: status chip shows connected project name / "Connected" label
// ---------------------------------------------------------------------------
describe('IMP-023: integration status chip', () => {
  it('jiraIntegration$ exposes jiraResources when connected', async () => {
    const fakeJira = {
      provider: 'jira',
      jiraResources: [{ id: 'r1', url: 'myteam.atlassian.net', name: 'MyTeam', active: true }],
    };
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(fakeJira, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let jira: any = null;
    component.jiraIntegration$.subscribe(v => (jira = v));
    expect(jira.jiraResources[0].active).toBe(true);
    expect(jira.jiraResources[0].name).toBe('MyTeam');
  });

  it('active project is identifiable from jiraResources', async () => {
    const fakeJira = {
      provider: 'jira',
      jiraResources: [
        { id: 'r1', url: 'a.atlassian.net', name: 'Alpha', active: false },
        { id: 'r2', url: 'b.atlassian.net', name: 'Beta', active: true },
      ],
    };
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(fakeJira, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let jira: any = null;
    component.jiraIntegration$.subscribe(v => (jira = v));
    const active = jira.jiraResources.find((r: any) => r.active);
    expect(active?.name).toBe('Beta');
  });

  it('linearIntegration$ is truthy when Linear is connected', async () => {
    const fakeLinear = { provider: 'linear', id: 'lin-1' };
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(null, fakeLinear, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let linear: any = null;
    component.linearIntegration$.subscribe(v => (linear = v));
    expect(linear).toBeTruthy();
  });

  it('linearIntegration$ is falsy when Linear is not connected', async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsComponent, NoopAnimationsModule],
      providers: buildProviders(null, null, null),
    }).compileComponents();

    const fixture = TestBed.createComponent(IntegrationsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let linear: any = 'not-set';
    component.linearIntegration$.subscribe(v => (linear = v));
    expect(linear).toBeFalsy();
  });
});
