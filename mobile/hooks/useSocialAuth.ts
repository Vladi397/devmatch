import { useEffect } from "react";
import { Platform, Alert } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { GOOGLE_CLIENT_IDS, LINKEDIN_CLIENT_ID } from "@/constants/oauth";
import { API_URL } from "@/constants/api";

WebBrowser.maybeCompleteAuthSession();

const LINKEDIN_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
  tokenEndpoint:         "https://www.linkedin.com/oauth/v2/accessToken",
};

type SocialAuthCallbacks = {
  onSuccess: (token: string, user: { id: string; email: string; name: string }) => void;
  onError:   (msg: string) => void;
  onLoading: (loading: boolean) => void;
};

export function useSocialAuth({ onSuccess, onError, onLoading }: SocialAuthCallbacks) {
  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId:     GOOGLE_CLIENT_IDS.webClientId,
    iosClientId:     GOOGLE_CLIENT_IDS.iosClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
  });

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile", path: "auth" });
  const [linkedinRequest, linkedinResponse, linkedinPrompt] = AuthSession.useAuthRequest(
    {
      clientId:     LINKEDIN_CLIENT_ID,
      redirectUri,
      scopes:       ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE:      true,
    },
    LINKEDIN_DISCOVERY,
  );

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const token = googleResponse.authentication?.accessToken;
      if (token) callBackend("google", token, "", "");
    } else if (googleResponse?.type === "error") {
      onError("Google sign-in failed. Please try again.");
    }
  }, [googleResponse]);

  useEffect(() => {
    if (linkedinResponse?.type === "success") {
      const code = linkedinResponse.params.code;
      const verifier = linkedinRequest?.codeVerifier ?? "";
      if (code) callBackend("linkedin", code, "", verifier);
    } else if (linkedinResponse?.type === "error") {
      onError("LinkedIn sign-in failed. Please try again.");
    }
  }, [linkedinResponse, linkedinRequest]);

  async function callBackend(provider: string, token: string, email: string, extra: string) {
    onLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/social`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider, token, email, extra }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.token, data.user);
      } else {
        onError(data.message ?? "Social login failed.");
      }
    } catch {
      onError("Network error. Please try again.");
    } finally {
      onLoading(false);
    }
  }

  async function signInWithApple() {
    if (Platform.OS !== "ios") {
      Alert.alert("Apple Sign In", "Apple Sign In is only available on iOS.");
      return;
    }
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean).join(" ");
      await callBackend("apple", cred.identityToken ?? "", cred.email ?? "", name);
    } catch (e: any) {
      if (e.code !== "ERR_CANCELED") {
        onError("Apple Sign In failed. Please try again.");
      }
    }
  }

  return {
    signInWithGoogle:   () => googlePrompt(),
    signInWithApple,
    signInWithLinkedIn: () => linkedinPrompt(),
  };
}
