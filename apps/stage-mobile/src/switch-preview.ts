import * as Updates from "expo-updates";

export async function switchPreview(channel: string, previousChannel: string): Promise<void> {
  if (!Updates.isEnabled) {
    throw new Error("A troca remota funciona no build do TestFlight, não dentro do Expo Go.");
  }

  try {
    Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": channel });
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      throw new Error("Esta branch ainda não possui um preview compatível publicado.");
    }
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": previousChannel });
    throw error;
  }
}
