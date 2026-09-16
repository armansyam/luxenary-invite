"use client";

import React from "react";
import GuestMomentClient from "@/app/components/features/GuestMomentClient";

export default function DemoShareMomentPage() {
  const coupleName = "Raditya & Alana";
  const invitationId = "demo-sharemoment";
  const coverUrl = "/demo/kalandra/cover.webp";
  const backUrl = "/demo";
  const galleryUrl = "/demo/memories";

  const sampleMemories = [
    {
      id: "demo-sample-1",
      senderName: "Budi Santoso & Keluarga",
      mediaUrl: "/demo/candani/gallery_01.webp",
      mediaType: "PHOTO",
      message: "Selamat berbahagia untuk Raditya & Alana! Sakinah mawaddah warahmah selamanya 🎉",
    },
    {
      id: "demo-sample-2",
      senderName: "Sahabat SMA (Dimas & Tim)",
      mediaUrl: "/demo/kalandra/gallery_02.webp",
      mediaType: "PHOTO",
      message: "Happy wedding brother! Akhirnya berlabuh di pelabuhan terakhir 🥂",
    },
  ];

  return (
    <GuestMomentClient
      invitationId={invitationId}
      coupleName={coupleName}
      coverUrl={coverUrl}
      memories={sampleMemories}
      galleryUrl={galleryUrl}
      backUrl={backUrl}
      isTestMode={true}
      openingLayout="editorial_showcase"
      filterId="aura_90s"
      shotsQuota={5}
      dateStampEnabled={true}
      dateFormat="DD MM 'YY"
      currentSessionName="Resepsi Malam"
      isSessionActive={true}
      onPhotoUploaded={(newMemory: any) => {
        try {
          const saved = JSON.parse(sessionStorage.getItem("demo_guest_moments") || "[]");
          saved.unshift({
            id: newMemory?.id || `demo-user-${Date.now()}`,
            senderName: newMemory?.senderName || "Tamu Undangan (Anda)",
            senderEmail: "demo-user@session.local",
            message: newMemory?.caption || newMemory?.message || "Selamat menempuh hidup baru! Bahagia dan berkah selalu ✨",
            mediaUrl: newMemory?.mediaUrl || "/demo/candani/gallery_01.webp",
            createdAt: new Date().toISOString(),
            isUserUploaded: true,
          });
          sessionStorage.setItem("demo_guest_moments", JSON.stringify(saved));
        } catch {}
      }}
    />
  );
}
