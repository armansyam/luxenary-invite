import { renderTemplateFile } from "@/lib/renderTemplate";

export default function DemoPage() {
  const data = {
    groomName: "Adi",
    brideName: "Irma",
    groomDisplayName: "Adi (Budi)",
    brideDisplayName: "Irma (Sari)",
    groomParents: "Putra pertama Bapak & Ibu Santoso",
    brideParents: "Putri pertama Bapak & Ibu Wijaya",
    groomInstagram: "adi_santoso",
    brideInstagram: "irma_wijaya",
    openingQuote: "Dan di antara tanda-tanda kekuasaan-Nya adalah Dia menciptakan pasangan-pasangan bagimu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.",
    openingQuoteRef: "QS. Ar-Rum: 21",
    globalBgUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80",
    groomPhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    bridePhotoUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    sidebarPhotoUrl: "https://images.unsplash.com/photo-1519225421980-715cb021543f?w=800&q=80",
    waLink: "https://wa.me/6281234567890",
    eventDataHtml: `
      <div style="margin-bottom:1rem">
        <h3>Akad Nikah</h3>
        <p>15 Juni 2024 • 10:00 WIB</p>
        <p>Masjid Agung Al-Mukminin, Jakarta</p>
      </div>
      <div style="margin-bottom:1rem">
        <h3>Resepsi</h3>
        <p>15 Juni 2024 • 12:00 WIB</p>
        <p>Hotel Mulia, Jakarta</p>
      </div>
    `,
    loveStoryHtml: `
      <div style="margin-bottom:1.5rem">
        <h3>Pertama Bertemu</h3>
        <p>Di kantor yang sama, 2019. Dia yang pertama mengajak ngopi.</p>
      </div>
      <div style="margin-bottom:1.5rem">
        <h3>Lamaran</h3>
        <p>Di tempat pertama bertemu, di bawah hujan meteor. Dia berkutik, aku terkejut.</p>
      </div>
    `,
    galleryHtml: `
      <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80" alt="Gallery" style="width:100%; margin-bottom:0.5rem; border-radius:8px;">
      <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80" alt="Gallery" style="width:100%; margin-bottom:0.5rem; border-radius:8px;">
      <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80" alt="Gallery" style="width:100%; margin-bottom:0.5rem; border-radius:8px;">
    `,
    rsvpHtml: "",
    audioUrl: "",
  };

  const html = renderTemplateFile("kila", data);

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}