type UpdatePolicyActions = {
  applyUpdate: () => void;
  reload: () => void;
};

export class DeferredUpdatePolicy {
  private actions: UpdatePolicyActions = {
    applyUpdate: () => undefined,
    reload: () => undefined,
  };
  private readonly dirtyInputs = new Set<string>();
  private updateWaiting = false;
  private reloadWaiting = false;

  configure(actions: UpdatePolicyActions) {
    this.actions = actions;
    this.applyPendingActions();
  }

  setInputDirty(inputId: string, isDirty: boolean) {
    if (isDirty) {
      this.dirtyInputs.add(inputId);
    } else {
      this.dirtyInputs.delete(inputId);
    }

    this.applyPendingActions();
  }

  clearInput(inputId: string) {
    this.setInputDirty(inputId, false);
  }

  markUpdateWaiting() {
    this.updateWaiting = true;
    this.applyPendingActions();
  }

  markReloadWaiting() {
    this.reloadWaiting = true;
    this.applyPendingActions();
  }

  hasUnsavedInput() {
    return this.dirtyInputs.size > 0;
  }

  private applyPendingActions() {
    if (this.hasUnsavedInput()) {
      return;
    }

    if (this.updateWaiting) {
      this.updateWaiting = false;
      this.actions.applyUpdate();
    }

    if (this.reloadWaiting) {
      this.reloadWaiting = false;
      this.actions.reload();
    }
  }
}

export const pwaUpdatePolicy = new DeferredUpdatePolicy();
