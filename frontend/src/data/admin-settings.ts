import type { AdminSettingsResponse } from "../repositories/admin-settings.server.repository";

export type AdminSettingsData = {
  baseFee: string;
  freeThreshold: string;
};

export function mapAdminSettingsResponse(
  response: AdminSettingsResponse,
): AdminSettingsData {
  return {
    baseFee: response.shipping_policy.base_fee,
    freeThreshold: response.shipping_policy.free_threshold,
  };
}

export async function getAdminSettingsData(
  cookieHeader: string,
): Promise<AdminSettingsData> {
  const { requestAdminSettingsOnServer } = await import(
    "../repositories/admin-settings.server.repository"
  );
  const response = await requestAdminSettingsOnServer(cookieHeader);

  return mapAdminSettingsResponse(response);
}
