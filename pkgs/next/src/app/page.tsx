"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      count: {count}
      <Button onClick={() => setCount(count + 1)}>shadcn/ui button</Button>
    </main>
  );
}
