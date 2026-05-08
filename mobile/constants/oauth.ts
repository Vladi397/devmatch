// ─── OAuth Credentials ────────────────────────────────────────────────────────
// Fill these in after setting up your developer apps:
//
//  Google: https://console.cloud.google.com → APIs & Services → Credentials
//    Create OAuth 2.0 Client IDs for Web, iOS, Android
//
//  LinkedIn: https://www.linkedin.com/developers/apps
//    Create an app, enable "Sign In with LinkedIn using OpenID Connect"
//    Add redirect URI: mobile://auth

export const GOOGLE_CLIENT_IDS = {
  webClientId:     "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com",
  iosClientId:     "YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com",
  androidClientId: "YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};

export const LINKEDIN_CLIENT_ID = "YOUR_LINKEDIN_CLIENT_ID";
