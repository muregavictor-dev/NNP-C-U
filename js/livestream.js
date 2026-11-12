(() => {
  const player = document.getElementById("liveStreamPlayer");
  const status = document.getElementById("liveStreamStatus");
  const watchLink = document.getElementById("liveStreamLink");

  if (!player || !status || !watchLink) {
    console.error("Unable to initialize the livestream: required page elements are missing.");
    return;
  }

  const refreshIntervalMs = 20 * 60 * 1000;
  let currentVideoId = "";
  let isLoading = false;

  function showUnavailable(message) {
    status.textContent = message;
    watchLink.href = "https://www.youtube.com/@nnpcumedia";
    watchLink.textContent = "Visit NNPCU Media on YouTube";
    watchLink.hidden = false;
  }

  async function loadStream() {
    if (isLoading) return;
    isLoading = true;

    try {
      const response = await fetch("/api/youtube", {
        headers: { Accept: "application/json" }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Livestream lookup failed with status ${response.status}`);
      }

      if (typeof result.videoId !== "string" || !/^[\w-]{11}$/.test(result.videoId)) {
        throw new Error("YouTube returned an invalid video identifier.");
      }

      if (result.videoId !== currentVideoId) {
        player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(result.videoId)}?rel=0`;
        currentVideoId = result.videoId;
      }

      const isLive = result.kind === "live";
      status.textContent = isLive
        ? `Live now: ${result.title}`
        : `Now playing the latest video: ${result.title}`;
      watchLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(result.videoId)}`;
      watchLink.textContent = "Watch on YouTube";
      watchLink.hidden = false;
    } catch (error) {
      console.error("Unable to load the NNPCU YouTube stream.", error);
      if (!currentVideoId) {
        player.removeAttribute("src");
        showUnavailable("The stream is temporarily unavailable. Visit the channel for current videos.");
      } else {
        status.textContent = "Unable to refresh the stream. The current video is still available.";
      }
    } finally {
      isLoading = false;
    }
  }

  loadStream();
  window.setInterval(loadStream, refreshIntervalMs);
})();
