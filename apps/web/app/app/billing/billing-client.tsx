"use client";

import { useState } from "react";
import { BillingCheckoutButton, BillingIntervalToggle } from "./billing-checkout-button";

export function BillingClient() {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <>
      <BillingIntervalToggle value={interval} onChange={setInterval} />
      <BillingCheckoutButton interval={interval} />
    </>
  );
}
