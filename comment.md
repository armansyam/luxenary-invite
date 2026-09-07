# scrip auto scroll untuk console

(() => {
  // Hentikan proses lama jika ada
  if (window.__cineScroll) cancelAnimationFrame(window.__cineScroll);

  // Kecepatan dalam pixel per detik:
  // 50 = Sangat sinematik / slow-motion elegan
  // 80 = Kecepatan ideal pameran video (rekomendasi)
  // 120 = Agak cepat
  let speed = 110; 

  let lastTime = performance.now();
  let currentY = window.scrollY;

  function cinematicStep(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    // Akumulasi posisi presisi berbasis milidetik waktu riil
    currentY += speed * delta;
    window.scrollTo(0, currentY);

    // Otomatis stop saat mentok di bawah
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2) {
      console.log("🎬 Selesai mencapai dasar halaman.");
      return;
    }

    window.__cineScroll = requestAnimationFrame(cinematicStep);
  }

  window.__cineScroll = requestAnimationFrame(cinematicStep);
  console.log("🎬 Cinematic Smooth Scroll Aktif! Ketik stopScroll() untuk pause.");

  window.stopScroll = () => {
    cancelAnimationFrame(window.__cineScroll);
    console.log("⏸️ Scroll dihentikan.");
  };
})();


# skrip record & auto scroll console

(async () => {
  if (window.__pageRecorder) {
    console.warn("Perekam sudah berjalan.");
    return;
  }

  // Kunci capture HANYA pada tab halaman aktif dengan resolusi tajam
  const stream = await navigator.mediaDevices.getDisplayMedia({
    preferCurrentTab: true,
    video: {
      displaySurface: "browser",
      width: { ideal: 1536, max: 3840 },
      height: { ideal: 2048, max: 3840 },
      frameRate: { ideal: 60 }
    },
    audio: false
  });

  // Paksa codec VP9 dengan Bitrate 25 Mbps (Kualitas Studio / Sangat Tajam)
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 25000000 // 25 Mbps (Super Jernih, teks serif tidak pecah)
  });

  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekaman-halaman-${Date.now()}.webm`;
    a.click();
    console.log("💾 Video halaman Ultra-HD berhasil didownload!");
    window.__pageRecorder = null;
  };

  recorder.start();
  window.__pageRecorder = { recorder, stream };
  console.log("🔴 REKAM HALAMAN AKTIF (25 Mbps Ultra-HD)! Ketik stopHalaman() untuk download.");

  window.stopHalaman = () => {
    recorder.stop();
    stream.getTracks().forEach(t => t.stop());
  };
})();
