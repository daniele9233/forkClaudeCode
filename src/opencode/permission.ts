import { useMutation } from "@tanstack/react-query";
import { getClient } from "./client";

export type PermissionResponse = "once" | "always" | "reject";

export function useRespondPermission() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      permissionId,
      response,
    }: {
      sessionId: string;
      permissionId: string;
      response: PermissionResponse;
    }) => {
      await getClient().postSessionIdPermissionsPermissionId({
        path: { id: sessionId, permissionID: permissionId },
        body: { response },
        throwOnError: true,
      });
    },
  });
}
