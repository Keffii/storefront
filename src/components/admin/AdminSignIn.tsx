"use client";

import "@aws-amplify/ui-react/styles.css";
import { Authenticator, ThemeProvider, translations, type Theme } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import outputs from "../../../amplify_outputs.json";

// ssr: true stores the Cognito tokens in cookies, so the server can verify them.
Amplify.configure(outputs, { ssr: true });
I18n.putVocabularies(translations);
I18n.setLanguage("sv");

const theme: Theme = {
  name: "objekt",
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: "#f7f4ef" },
          80: { value: "#1f1f1f" },
          90: { value: "#3a3a3a" },
          100: { value: "#1f1f1f" },
        },
      },
    },
    radii: { small: { value: "2px" }, medium: { value: "4px" } },
    fonts: { default: { variable: { value: "var(--font-sans)" }, static: { value: "var(--font-sans)" } } },
  },
};

function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
    router.refresh();
  }, [router]);
  return <p>Loggar in …</p>;
}

export function AdminSignIn() {
  return (
    <ThemeProvider theme={theme}>
      <Authenticator hideSignUp loginMechanisms={["email"]}>
        <Redirect />
      </Authenticator>
    </ThemeProvider>
  );
}
