(() => {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;

  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("The site could not enable install support.", error);
  });
})();
