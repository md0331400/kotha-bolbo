// ============================================================
// ONESIGNAL CONFIGURATION
// Replace with your own OneSignal config
// ============================================================

export const oneSignalConfig = {
  appId: 36434abb-4e91-4194-ad80-3c60370698b9
};

export const isOneSignalConfigured = (): boolean => {
  return oneSignalConfig.appId !== 36434abb-4e91-4194-ad80-3c60370698b9 && oneSignalConfig.appId.length > 10;
};

// OneSignal initialization (loaded dynamically)
export const initOneSignal = async (): Promise<void> => {
  if (!isOneSignalConfigured()) {
    console.warn('OneSignal not configured. Please update src/onesignal/index.ts');
    return;
  }

  try {
    // Load OneSignal SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    script.onload = async () => {
      try {
        const OneSignal = (window as any).OneSignal;
        if (!OneSignal) return;

        await OneSignal.init({
          appId: oneSignalConfig.appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          promptOptions: {
            slidedown: {
              prompts: [{
                type: 'push',
                autoPrompt: false,
                text: {
                  actionMessage: "Stay connected! Get instant notifications for new messages.",
                  acceptButton: "Allow",
                  cancelButton: "Not Now"
                }
              }]
            }
          }
        });

        // Handle notification clicks
        OneSignal.Notifications.addEventListener('click', (event: any) => {
          const data = event.notification?.additionalData;
          if (data?.convId) {
            // Navigate to conversation - dispatch custom event
            window.dispatchEvent(new CustomEvent('notification-click', { detail: { convId: data.convId } }));
          }
        });

        console.log('OneSignal initialized successfully');
      } catch (err) {
        console.error('OneSignal init error:', err);
      }
    };
  } catch (err) {
    console.error('Failed to load OneSignal SDK:', err);
  }
};

// Request notification permission with custom UI
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isOneSignalConfigured()) return false;
  try {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return false;
    await OneSignal.Notifications.requestPermission();
    return true;
  } catch {
    return false;
  }
};

// Set external user ID (Firebase UID)
export const setOneSignalUserId = async (userId: string): Promise<void> => {
  if (!isOneSignalConfigured()) return;
  try {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;
    await OneSignal.login(userId);
  } catch (err) {
    console.error('Failed to set OneSignal user ID:', err);
  }
};

// Logout from OneSignal
export const logoutOneSignal = async (): Promise<void> => {
  if (!isOneSignalConfigured()) return;
  try {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) return;
    await OneSignal.logout();
  } catch (err) {
    console.error('Failed to logout from OneSignal:', err);
  }
};
