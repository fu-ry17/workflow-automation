"use client";

import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "../lib/auth-client";

export const GoogleButton = () => {
  const handleSignIn = async () => {
    const data = await authClient.signIn.social({
      provider: "google",
    });

    console.log({ data });
  };

  return (
    <Button onClick={handleSignIn}>
      <FcGoogle className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  );
};
