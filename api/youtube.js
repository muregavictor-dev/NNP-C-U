const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_CHANNEL_HANDLE = "nnpcumedia";
const REQUEST_TIMEOUT_MS = 8000;
const RESPONSE_CACHE_SECONDS = 1200;

async function youtubeRequest(resource, params, apiKey, signal) {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/${resource}`);
  Object.entries({ ...params, key: apiKey }).forEach(([name, value]) => {
    url.searchParams.set(name, value);
  });

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`YouTube API ${resource} request failed with status ${response.status}`);
  }

  const result = await response.json();
  if (!result || typeof result !== "object") {
    throw new Error(`YouTube API ${resource} returned an invalid response`);
  }
  return result;
}

function getVideo(item) {
  const videoId = item?.id?.videoId || item?.snippet?.resourceId?.videoId;
  const title = item?.snippet?.title;
  if (typeof videoId !== "string" || typeof title !== "string") return null;
  return { videoId, title };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "YouTube streaming is not configured" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const channelData = await youtubeRequest("channels", {
      part: "contentDetails",
      forHandle: YOUTUBE_CHANNEL_HANDLE
    }, apiKey, controller.signal);
    const channel = channelData.items?.[0];
    const channelId = channel?.id;
    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!channelId || !uploadsPlaylistId) {
      throw new Error(`YouTube channel @${YOUTUBE_CHANNEL_HANDLE} was not found`);
    }

    const liveData = await youtubeRequest("search", {
      part: "snippet",
      channelId,
      eventType: "live",
      type: "video",
      maxResults: "1"
    }, apiKey, controller.signal);
    const liveVideo = liveData.items?.map(getVideo).find(Boolean);

    let selectedVideo = liveVideo;
    let kind = "live";
    if (!selectedVideo) {
      kind = "latest";
      const uploadsData = await youtubeRequest("playlistItems", {
        part: "snippet",
        playlistId: uploadsPlaylistId,
        maxResults: "50"
      }, apiKey, controller.signal);
      const uploadIds = uploadsData.items?.map((item) => item?.snippet?.resourceId?.videoId)
        .filter((id) => typeof id === "string");

      if (uploadIds?.length) {
        const videosData = await youtubeRequest("videos", {
          part: "snippet,status",
          id: uploadIds.join(",")
        }, apiKey, controller.signal);
        const embeddableVideos = new Map(
          (videosData.items || [])
            .filter((video) => video.status?.privacyStatus === "public"
              && video.status?.embeddable === true)
            .map((video) => [video.id, video])
        );
        selectedVideo = uploadIds
          .map((id) => embeddableVideos.get(id))
          .find(Boolean);
        if (selectedVideo) {
          selectedVideo = getVideo({
            id: { videoId: selectedVideo.id },
            snippet: selectedVideo.snippet
          });
        }
      }
    }

    if (!selectedVideo) {
      res.setHeader(
        "Cache-Control",
        `public, s-maxage=${RESPONSE_CACHE_SECONDS}, stale-while-revalidate=300`
      );
      return res.status(404).json({ error: "No public, embeddable videos were found on the channel" });
    }

    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${RESPONSE_CACHE_SECONDS}, stale-while-revalidate=300`
    );
    return res.status(200).json({ ...selectedVideo, kind });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("YouTube stream lookup failed.", error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "YouTube stream lookup timed out"
        : "Unable to retrieve videos from the YouTube channel"
    });
  } finally {
    clearTimeout(timeout);
  }
}
