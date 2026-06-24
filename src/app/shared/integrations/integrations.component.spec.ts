import { of } from 'rxjs';
import { IntegrationsComponent } from './integrations.component';

function buildComp(confirmResult: boolean) {
  const removedLinear = jasmine.createSpy('removeLinearIntegration').and.returnValue(of(null));
  const removedSlack = jasmine.createSpy('removeSlackIntegration').and.returnValue(of(null));

  const comp = Object.create(IntegrationsComponent.prototype) as IntegrationsComponent;
  (comp as any).confirmDialog = {
    openConfirmationDialog: jasmine.createSpy('openConfirmationDialog').and.resolveTo(confirmResult),
  };
  (comp as any).linearService = { removeLinearIntegration: removedLinear };
  (comp as any).slackService = { removeSlackIntegration: removedSlack };

  return { comp, removedLinear, removedSlack };
}

// ---------------------------------------------------------------------------
// IMP-024: confirm dialog guards disconnect actions
// ---------------------------------------------------------------------------
describe('IMP-024: disconnect confirm guard', () => {
  describe('removeLinearIntegration', () => {
    it('does NOT remove when user cancels', async () => {
      const { comp, removedLinear } = buildComp(false);
      await comp.removeLinearIntegration();
      expect(removedLinear).not.toHaveBeenCalled();
    });

    it('removes when user confirms', async () => {
      const { comp, removedLinear } = buildComp(true);
      await comp.removeLinearIntegration();
      expect(removedLinear).toHaveBeenCalledOnceWith();
    });

    it('always prompts the user', async () => {
      const { comp } = buildComp(false);
      await comp.removeLinearIntegration();
      expect((comp as any).confirmDialog.openConfirmationDialog).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ title: 'Disconnect Linear?' })
      );
    });
  });

  describe('removeSlackIntegration', () => {
    it('does NOT remove when user cancels', async () => {
      const { comp, removedSlack } = buildComp(false);
      await comp.removeSlackIntegration();
      expect(removedSlack).not.toHaveBeenCalled();
    });

    it('removes when user confirms', async () => {
      const { comp, removedSlack } = buildComp(true);
      await comp.removeSlackIntegration();
      expect(removedSlack).toHaveBeenCalledOnceWith();
    });

    it('always prompts the user', async () => {
      const { comp } = buildComp(false);
      await comp.removeSlackIntegration();
      expect((comp as any).confirmDialog.openConfirmationDialog).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ title: 'Disconnect Slack?' })
      );
    });
  });
});
