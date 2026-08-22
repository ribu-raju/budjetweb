"use client";

import { useEffect, useState } from "react";

export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 5) setGreeting("Good night");
    else if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const firstName = name.split(" ")[0];

  return (
    <h1 className="text-xl font-semibold sm:text-2xl">
      {greeting}, {firstName} 👋
    </h1>
  );
}
