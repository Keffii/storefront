"use client";

import { Amplify } from "aws-amplify";
import { signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import outputs from "../../../amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.replace("/admin/logga-in");
        router.refresh();
      }}
    >
      Logga ut
    </Button>
  );
}
