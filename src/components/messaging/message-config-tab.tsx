"use client";

import { Card } from "@/components/ui/card";
import { SMSProviderConfigTab } from "@/components/settings/messages/sms-provider-config-tab";

/**
 * Message Configuration Tab
 *
 * This component provides an interface for configuring messaging-related settings,
 * specifically SMS providers.
 */

export function MessageConfigTab() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Messaging Configuration</h1>
        <p className="text-muted-foreground">
          Configure SMS providers for sending messages
        </p>
      </div>

      <SMSProviderConfigTab />
    </Card>
  );
}
