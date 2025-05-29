import { showToast } from "./toast";

class SessionTimerService {
  constructor() {
    this.warningTimer = null;
    this.logoutTimer = null;
    this.warningCallback = null;
    this.logoutCallback = null;
    this.warningShown = false;
    this.sessionDuration = 55 * 60 * 1000;
    this.warningTime = 5 * 60 * 1000;
  }

  start(logoutCallback, warningCallback) {
    this.clear();
    this.warningShown = false;
    this.logoutCallback = logoutCallback;
    this.warningCallback = warningCallback;

    this.warningTimer = setTimeout(() => {
      this.warningShown = true;
      if (this.warningCallback) {
        this.warningCallback();
      }
    }, this.sessionDuration - this.warningTime);

    this.logoutTimer = setTimeout(() => {
      if (this.logoutCallback) {
        localStorage.setItem('logout_reason', 'session_expired');
        this.logoutCallback();
      }
    }, this.sessionDuration);
  }

  refresh() {
    this.clear();
    this.start(this.logoutCallback, this.warningCallback);
  }

  clear() {
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    this.warningTimer = null;
    this.logoutTimer = null;
    this.warningShown = false;
  }

  resetTimersOnActivity() {
    if (!this.warningShown) {
      this.refresh();
    }
  }

  handleManualLogout() {
    localStorage.removeItem('logout_reason');
    this.clear();
  }
}

const sessionTimer = new SessionTimerService();
export default sessionTimer;