import { getAccessTokenFromRefreshToken } from "../src/lib/googleAuth";
import { lockdownFolderVideos } from "../src/lib/drive";

const ALL_SONGS_FOLDER_ID = "1HmTkPZi8DaJTT_lfGRnSpdN3nv5ClSgs";

async function main() {
  const accessToken = await getAccessTokenFromRefreshToken();
  console.log("Starting lockdown...");
  const result = await lockdownFolderVideos(ALL_SONGS_FOLDER_ID, accessToken);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
