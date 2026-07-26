# Kotha Bolbo Vercel backend fix

Deploy this `api/send-notification.js` in the Vercel project that serves `https://kothabolbo.vercel.app/api/send-notification`.

This version keeps web push support and adds Android FCM high-priority data delivery. It sends the sender photo URL in `data.icon`, which the Android app uses for the notification avatar.
