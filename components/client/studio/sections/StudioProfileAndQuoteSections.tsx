"use client";

import { safeParseParticipants } from "@/lib/participantUtils";
import {
  PERSONAL_SUB_EVENT_PRESETS,
  EVENT_SUB_EVENT_PRESETS,
  getMediaSlotLabel,
  resolveInvitationDisplayName,
  resolveSubEventMeta,
} from "@/lib/invitationUtils";
import { QuotesSectionEditor } from "@/components/client/studio/QuotesSectionEditor";
import { Input, PhotoInput, SectionHeaderActions } from "@/components/client/studio/StudioFormControls";
import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioProfileAndQuoteSections() {
  const {
    activeBlueprint,
    activeSectionTab,
    changingSubEvent,
    collapsed,
    customSubEventDraft,
    displayOrder,
    getCustomLabel,
    handleSwitchSubEvent,
    handleUploadEnd,
    handleUploadStart,
    invitation,
    invitationId,
    isDirty,
    isUploading,
    media,
    renderSectionNavFooter,
    saveSection,
    saving,
    savingSec,
    sectionHeading,
    setCustomSubEventDraft,
    setSubEventCustomOpen,
    subEventCustomOpen,
    toggleSection,
    updateCustomLabel,
    updateFeatureSetting,
    updateField,
    updateMedia,
    updateParticipantData,
    updateWeddingField,
    weddingValue,
  } = useStudioEditor();

  return (
    <>
      {/* 3. SEKSI PROFIL MEMPELAI (SEC3) */}
      {(activeSectionTab === "sec3") && (
      <section id="section-sec3" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec3")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec3
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec3")}</h2>
              {collapsed.sec3 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="font-medium text-stone-700">
                    {resolveInvitationDisplayName(invitation)}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec3 && (
              <p className="text-xs text-stone-500 mt-0.5">
                {(!invitation?.eventType || invitation?.eventType === "WEDDING")
                  ? "Data lengkap, akun sosial media, dan foto portrait pengantin"
                  : invitation?.eventType === "EVENT"
                  ? "Judul acara, penyelenggara/instansi, dan foto atau banner utama"
                  : "Informasi profil tokoh utama, keluarga, dan foto portrait"}
              </p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec3)}
              isSaving={saving && savingSec === "sec3"}
              onSave={() => saveSection("sec3")}
              collapsed={Boolean(collapsed.sec3)}
              onToggle={() => toggleSection("sec3")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec3 && (
          <div className="p-3.5 sm:p-7 space-y-5 sm:space-y-6">
            {/* Form Wedding / Multi-Event Persona */}
            {(!invitation.eventType || invitation.eventType === "WEDDING") ? (
              <>
                <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-auto w-fit">
                  <button
                    type="button"
                    onClick={() => updateFeatureSetting("displayOrder", "BRIDE_FIRST")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      displayOrder === "BRIDE_FIRST"
                        ? "bg-white text-rose-900 shadow-xs border border-stone-200/80"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Mempelai Wanita Dahulu
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFeatureSetting("displayOrder", "GROOM_FIRST")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      displayOrder === "GROOM_FIRST"
                        ? "bg-white text-amber-900 shadow-xs border border-stone-200/80"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Mempelai Pria Dahulu
                  </button>
                </div>

                <div className="space-y-5">
                  {displayOrder === "BRIDE_FIRST" ? (
                    <>
                      {/* Card Data Mempelai Wanita */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-rose-200/80 bg-rose-50/20 space-y-4">
                        <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                          <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Mempelai Wanita (The Bride) — Tampil Pertama</h3>
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">Pihak Mengundang</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Nama Lengkap Wanita *" value={weddingValue("brideName")} onChange={(v) => updateWeddingField("brideName", v)} placeholder="Masukkan nama lengkap mempelai wanita" />
                          <Input label="Nama Panggilan Wanita" value={weddingValue("brideNickname")} onChange={(v) => updateWeddingField("brideNickname", v)} placeholder="Masukkan panggilan wanita" />
                          <Input label="Nama Ayah (Mempelai Wanita)" value={weddingValue("brideFather")} onChange={(v) => updateWeddingField("brideFather", v)} placeholder="Contoh: Tomm Posma / Alm. Tomm Posma / Bpk. Tomm Posma" />
                          <Input label="Nama Ibu (Mempelai Wanita)" value={weddingValue("brideMother")} onChange={(v) => updateWeddingField("brideMother", v)} placeholder="Contoh: Endang Noffiyanti / Almh. Endang Noffiyanti / Ibu Endang Noffiyanti" />
                          <Input label="Username Instagram Wanita" value={weddingValue("brideInstagram")} onChange={(v) => updateWeddingField("brideInstagram", v)} placeholder="usernameig (tanpa @)" />
                        </div>
                      </div>

                      {/* Card Data Mempelai Pria */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Pria (The Groom)</h3>
                          <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Pria</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Nama Lengkap Pria *" value={weddingValue("groomName")} onChange={(v) => updateWeddingField("groomName", v)} placeholder="Masukkan nama lengkap mempelai pria" />
                          <Input label="Nama Panggilan Pria" value={weddingValue("groomNickname")} onChange={(v) => updateWeddingField("groomNickname", v)} placeholder="Masukkan panggilan pria" />
                          <Input label="Nama Ayah (Mempelai Pria)" value={weddingValue("groomFather")} onChange={(v) => updateWeddingField("groomFather", v)} placeholder="Contoh: Arif Yaniadi / Alm. Arif Yaniadi / Bpk. Arif Yaniadi" />
                          <Input label="Nama Ibu (Mempelai Pria)" value={weddingValue("groomMother")} onChange={(v) => updateWeddingField("groomMother", v)} placeholder="Contoh: Yuni Widiastuti / Almh. Yuni Widiastuti / Ibu Yuni Widiastuti" />
                          <Input label="Username Instagram Pria" value={weddingValue("groomInstagram")} onChange={(v) => updateWeddingField("groomInstagram", v)} placeholder="usernameig (tanpa @)" />
                        </div>
                      </div>

                      {/* Foto Portrait Berdampingan di Bagian Bawah */}
                      <div className="pt-1 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-stone-900">Foto Portrait Kedua Mempelai</h3>
                            <p className="text-[10px] text-stone-500">Foto portrait khusus masing-masing mempelai</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <PhotoInput
                            label="Foto Portrait Mempelai Wanita"
                            desc="Foto portrait khusus mempelai wanita"
                            value={media["BRIDE_PHOTO"] || ""}
                            onChange={(url) => updateMedia("BRIDE_PHOTO", url)}
                            placeholder="https://.../bride-portrait.jpg"
                            invitationId={invitationId}
                            slot="BRIDE_PHOTO"
                            onUploadStart={handleUploadStart}
                            onUploadEnd={handleUploadEnd}
                          />
                          <PhotoInput
                            label="Foto Portrait Mempelai Pria"
                            desc="Foto portrait khusus mempelai pria"
                            value={media["GROOM_PHOTO"] || ""}
                            onChange={(url) => updateMedia("GROOM_PHOTO", url)}
                            placeholder="https://.../groom-portrait.jpg"
                            invitationId={invitationId}
                            slot="GROOM_PHOTO"
                            onUploadStart={handleUploadStart}
                            onUploadEnd={handleUploadEnd}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Card Data Mempelai Pria */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 space-y-4">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                          <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Mempelai Pria (The Groom) — Tampil Pertama</h3>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">Pihak Mengundang</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Nama Lengkap Pria *" value={weddingValue("groomName")} onChange={(v) => updateWeddingField("groomName", v)} placeholder="Masukkan nama lengkap mempelai pria" />
                          <Input label="Nama Panggilan Pria" value={weddingValue("groomNickname")} onChange={(v) => updateWeddingField("groomNickname", v)} placeholder="Masukkan panggilan pria" />
                          <Input label="Nama Ayah (Mempelai Pria)" value={weddingValue("groomFather")} onChange={(v) => updateWeddingField("groomFather", v)} placeholder="Contoh: Arif Yaniadi / Alm. Arif Yaniadi / Bpk. Arif Yaniadi" />
                          <Input label="Nama Ibu (Mempelai Pria)" value={weddingValue("groomMother")} onChange={(v) => updateWeddingField("groomMother", v)} placeholder="Contoh: Yuni Widiastuti / Almh. Yuni Widiastuti / Ibu Yuni Widiastuti" />
                          <Input label="Username Instagram Pria" value={weddingValue("groomInstagram")} onChange={(v) => updateWeddingField("groomInstagram", v)} placeholder="usernameig (tanpa @)" />
                        </div>
                      </div>

                      {/* Card Data Mempelai Wanita */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Mempelai Wanita (The Bride)</h3>
                          <span className="text-[10px] font-bold bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-full">Wanita</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Nama Lengkap Wanita *" value={weddingValue("brideName")} onChange={(v) => updateWeddingField("brideName", v)} placeholder="Masukkan nama lengkap mempelai wanita" />
                          <Input label="Nama Panggilan Wanita" value={weddingValue("brideNickname")} onChange={(v) => updateWeddingField("brideNickname", v)} placeholder="Masukkan panggilan wanita" />
                          <Input label="Nama Ayah (Mempelai Wanita)" value={weddingValue("brideFather")} onChange={(v) => updateWeddingField("brideFather", v)} placeholder="Contoh: Tomm Posma / Alm. Tomm Posma / Bpk. Tomm Posma" />
                          <Input label="Nama Ibu (Mempelai Wanita)" value={weddingValue("brideMother")} onChange={(v) => updateWeddingField("brideMother", v)} placeholder="Contoh: Endang Noffiyanti / Almh. Endang Noffiyanti / Ibu Endang Noffiyanti" />
                          <Input label="Username Instagram Wanita" value={weddingValue("brideInstagram")} onChange={(v) => updateWeddingField("brideInstagram", v)} placeholder="usernameig (tanpa @)" />
                        </div>
                      </div>

                      {/* Foto Portrait Berdampingan di Bagian Bawah */}
                      <div className="pt-1 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-stone-900">Foto Portrait Kedua Mempelai</h3>
                            <p className="text-[10px] text-stone-500">Foto portrait khusus masing-masing mempelai</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <PhotoInput
                            label="Foto Portrait Mempelai Pria"
                            desc="Foto portrait khusus mempelai pria"
                            value={media["GROOM_PHOTO"] || ""}
                            onChange={(url) => updateMedia("GROOM_PHOTO", url)}
                            placeholder="https://.../groom-portrait.jpg"
                            invitationId={invitationId}
                            slot="GROOM_PHOTO"
                            onUploadStart={handleUploadStart}
                            onUploadEnd={handleUploadEnd}
                          />
                          <PhotoInput
                            label="Foto Portrait Mempelai Wanita"
                            desc="Foto portrait khusus mempelai wanita"
                            value={media["BRIDE_PHOTO"] || ""}
                            onChange={(url) => updateMedia("BRIDE_PHOTO", url)}
                            placeholder="https://.../bride-portrait.jpg"
                            invitationId={invitationId}
                            slot="BRIDE_PHOTO"
                            onUploadStart={handleUploadStart}
                            onUploadEnd={handleUploadEnd}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (() => {
              const p = safeParseParticipants(invitation?.participantsJson);
              const evType = (invitation.eventType || "PERSONAL").toUpperCase();
              const curSubEvent = (invitation?.subEvent || "").trim();
              const isSubEditable =
                (evType === "PERSONAL" || evType === "EVENT") &&
                (invitation?.status === "DRAFT" || Boolean(invitation?.isEmergencyUnlocked));
              const activePresets =
                evType === "PERSONAL" ? PERSONAL_SUB_EVENT_PRESETS : EVENT_SUB_EVENT_PRESETS;
              const isCurrentCustom =
                Boolean(curSubEvent) &&
                !activePresets.some((pr) => pr.id.toLowerCase() === curSubEvent.toLowerCase());

              const subEventBar = (evType === "PERSONAL" || evType === "EVENT") ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        {evType === "PERSONAL"
                          ? "Sub-Acara Personal & Keluarga (Dinamis)"
                          : "Sub-Acara Event Umum (Dinamis)"}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {isSubEditable
                          ? "Pilih preset atau tulis sendiri nama acara Anda (mis. Tamatan Ngaji / Corporate). Tema dan data yang sudah diisi tetap terjaga."
                          : "Sub-acara dikunci setelah undangan diterbitkan."}
                      </p>
                    </div>
                    {curSubEvent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 w-fit">
                        Aktif: {curSubEvent}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activePresets.map((preset) => {
                      const activeSub =
                        !subEventCustomOpen && curSubEvent.toLowerCase() === preset.id.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={!isSubEditable || changingSubEvent || activeSub}
                          onClick={() => handleSwitchSubEvent(preset.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                            activeSub
                              ? "bg-amber-900 text-white shadow-2xs cursor-default"
                              : isSubEditable
                              ? "bg-white text-stone-700 border border-stone-200 hover:border-amber-400 cursor-pointer disabled:opacity-50"
                              : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                    {isSubEditable && (
                      <button
                        type="button"
                        disabled={changingSubEvent}
                        onClick={() => {
                          setCustomSubEventDraft(isCurrentCustom ? curSubEvent : "");
                          setSubEventCustomOpen((v) => !v);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                          subEventCustomOpen || isCurrentCustom
                            ? "bg-amber-900 text-white shadow-2xs"
                            : "bg-white text-amber-900 border border-dashed border-amber-400 hover:bg-amber-50"
                        }`}
                      >
                        {isCurrentCustom ? `Kustom: ${curSubEvent}` : "+ Tulis Sendiri"}
                      </button>
                    )}
                  </div>
                  {isSubEditable && subEventCustomOpen && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customSubEventDraft}
                        onChange={(e) => setCustomSubEventDraft(e.target.value)}
                        maxLength={50}
                        placeholder={
                          evType === "PERSONAL"
                            ? "Contoh: Tamatan Ngaji, Tedak Siten, Syukuran Rumah..."
                            : "Contoh: Rapat Kerja Nasional, Malam Keakraban, Awarding Night..."
                        }
                        className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={changingSubEvent || !customSubEventDraft.trim()}
                          onClick={() => handleSwitchSubEvent(customSubEventDraft)}
                          className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          {changingSubEvent ? "Menyimpan..." : "Terapkan"}
                        </button>
                        <button
                          type="button"
                          disabled={changingSubEvent}
                          onClick={() => setSubEventCustomOpen(false)}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold transition cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null;

              if (evType === "PERSONAL") {
                const person = p.person || {};
                const parents = p.parents || {};
                const personalMeta = resolveSubEventMeta("PERSONAL", curSubEvent);
                const fatherVal = person.fatherName ?? parents.father ?? "";
                const motherVal = person.motherName ?? parents.mother ?? "";
                const detailVal =
                  person.detail ??
                  (person.degree || person.major || person.institution
                    ? [person.degree, person.major, person.institution].filter(Boolean).join(" · ")
                    : person.age !== undefined
                    ? `${person.age} Tahun`
                    : "");

                const updatePersonalField = (patch: Record<string, any>) => {
                  updateParticipantData((prev) => {
                    const basePerson = prev.person || {};
                    const nextPerson = { ...basePerson, ...patch };
                    const nextParents = {
                      ...(prev.parents || {}),
                      ...(patch.fatherName !== undefined ? { father: patch.fatherName } : {}),
                      ...(patch.motherName !== undefined ? { mother: patch.motherName } : {}),
                    };
                    return {
                      ...prev,
                      person: nextPerson,
                      parents: nextParents,
                    };
                  });
                };

                return (
                  <div className="space-y-5">
                    {subEventBar}
                    <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Profil Tokoh Utama {curSubEvent ? `· ${curSubEvent}` : ""}
                        </h3>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                          {personalMeta.roleLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={`${personalMeta.personNameLabel} *`}
                          value={person.name || ""}
                          onChange={(v) => updatePersonalField({ name: v })}
                          placeholder={personalMeta.personNamePlaceholder}
                        />
                        <Input
                          label="Nama Panggilan *"
                          value={person.nickname || ""}
                          onChange={(v) => updatePersonalField({ nickname: v })}
                          placeholder={personalMeta.personNicknamePlaceholder}
                        />
                        <Input
                          label={`${personalMeta.detailLabel} (Opsional)`}
                          value={detailVal}
                          onChange={(v) => {
                            const ageMatch = /^\d+$/.test(v.trim()) ? parseInt(v.trim(), 10) : undefined;
                            updatePersonalField({
                              detail: v,
                              ...(ageMatch !== undefined ? { age: ageMatch } : {}),
                            });
                          }}
                          placeholder={personalMeta.detailPlaceholder}
                        />
                        <Input
                          label="Username Instagram (Opsional)"
                          value={person.instagram || ""}
                          onChange={(v) => updatePersonalField({ instagram: v })}
                          placeholder="usernameig (tanpa @)"
                        />
                        <Input
                          label="Nama Ayah / Wali (Opsional)"
                          value={fatherVal}
                          onChange={(v) => updatePersonalField({ fatherName: v })}
                          placeholder="Bpk. ..."
                        />
                        <Input
                          label="Nama Ibu (Opsional)"
                          value={motherVal}
                          onChange={(v) => updatePersonalField({ motherName: v })}
                          placeholder="Ibu ..."
                        />
                      </div>
                    </div>

                    <div className="pt-1 space-y-2.5">
                      <PhotoInput
                        label={getMediaSlotLabel("PROFILE_PHOTO", "PERSONAL", curSubEvent)}
                        desc={`Foto portrait utama (${curSubEvent || "Personal & Keluarga"})`}
                        value={media["PROFILE_PHOTO"] || ""}
                        onChange={(url) => updateMedia("PROFILE_PHOTO", url)}
                        placeholder="https://.../personal-portrait.jpg"
                        invitationId={invitationId}
                        slot="PROFILE_PHOTO"
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                      />
                    </div>
                  </div>
                );
              }

              // EVENT (Acara & Event Umum — Non-Personal, Strictly Zero Parents)
              const eventInfo = p.event || {};
              return (
                <div className="space-y-5">
                  {subEventBar}
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/40 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Informasi Acara &amp; Event Umum {curSubEvent ? `· ${curSubEvent}` : ""}
                      </h3>
                      <span className="text-[10px] font-bold bg-stone-200 text-stone-800 px-2.5 py-0.5 rounded-full">
                        {curSubEvent || "Event & Umum"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nama / Judul Acara *"
                        value={eventInfo.title || ""}
                        onChange={(v) => updateParticipantData((prev) => ({ ...prev, event: { ...prev.event, title: v } }))}
                        placeholder="Contoh: Grand Opening, Seminar Nasional, atau Reuni Akbar"
                      />
                      <Input
                        label="Sub-judul / Tema Acara"
                        value={eventInfo.subtitle || ""}
                        onChange={(v) => updateParticipantData((prev) => ({ ...prev, event: { ...prev.event, subtitle: v } }))}
                        placeholder="Contoh: Inovasi Bersama Menuju Masa Depan"
                      />
                      <Input
                        label="Penyelenggara / Instansi / Komunitas"
                        value={eventInfo.organizer || ""}
                        onChange={(v) => updateParticipantData((prev) => ({ ...prev, event: { ...prev.event, organizer: v } }))}
                        placeholder="Contoh: PT Nusantara Kreatif / Ikatan Alumni SMAN 1"
                      />
                    </div>
                  </div>

                  <div className="pt-1 space-y-2.5">
                    <PhotoInput
                      label={getMediaSlotLabel("EVENT_PHOTO", "EVENT", curSubEvent)}
                      desc="Banner atau foto visual identitas acara"
                      value={media["EVENT_PHOTO"] || ""}
                      onChange={(url) => updateMedia("EVENT_PHOTO", url)}
                      placeholder="https://.../event-banner.jpg"
                      invitationId={invitationId}
                      slot="EVENT_PHOTO"
                      onUploadStart={handleUploadStart}
                      onUploadEnd={handleUploadEnd}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => saveSection("sec3")}
                disabled={saving || isUploading || !isDirty.sec3}
                className={`px-5 py-2.5 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs ${
                  isUploading
                    ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed"
                    : !isDirty.sec3
                    ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                    : "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{saving ? "Menyimpan..." : isUploading ? "Sedang Mengunggah Foto..." : !isDirty.sec3 ? "Tersimpan" : (!invitation.eventType || invitation.eventType === "WEDDING") ? "Simpan Profil Mempelai" : "Simpan Profil Acara"}</span>
              </button>
            </div>
            {renderSectionNavFooter("sec3")}
          </div>
        )}
      </section>
      )}

      {/* 4. SEKSI KUTIPAN PEMBUKA (SEC4) */}
      {(activeSectionTab === "sec4") && (
      <section id="section-sec4" className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 overflow-hidden transition-all duration-200">
        <div
          onClick={() => toggleSection("sec4")}
          className={`flex items-center justify-between gap-3 transition cursor-pointer ${
            collapsed.sec4
              ? "px-3.5 py-3 sm:px-6 sm:py-3.5 hover:bg-stone-50/80"
              : "px-3.5 py-3 sm:p-6 border-b border-stone-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900">{sectionHeading("sec4")}</h2>
              {collapsed.sec4 && (
                <span className="text-xs text-stone-500 font-normal truncate flex items-center gap-1.5">
                  <span className="text-stone-300">•</span>
                  <span className="font-medium text-stone-700 truncate max-w-[240px] sm:max-w-md">
                    {invitation.openingQuoteRef || (invitation.openingQuote ? `"${invitation.openingQuote.slice(0, 30)}..."` : "Kutipan / Doa Pembuka")}
                  </span>
                </span>
              )}
            </div>
            {!collapsed.sec4 && (
              <p className="text-xs text-stone-500 mt-0.5">Kutipan indah, puisi cinta, kata mutiara, ayat suci, atau doa pembuka undangan</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <SectionHeaderActions
              isDirty={Boolean(isDirty.sec4)}
              isSaving={saving && savingSec === "sec4"}
              onSave={() => saveSection("sec4")}
              collapsed={Boolean(collapsed.sec4)}
              onToggle={() => toggleSection("sec4")}
              closedLabel="Edit"
            />
          </div>
        </div>

        {!collapsed.sec4 && (
          <div className="p-3.5 sm:p-7 space-y-4">
            <QuotesSectionEditor
              openingQuote={invitation.openingQuote || ""}
              openingQuoteRef={invitation.openingQuoteRef || ""}
              activeBlueprint={activeBlueprint}
              getCustomLabel={getCustomLabel}
              updateField={updateField}
              updateCustomLabel={updateCustomLabel}
              isDirty={Boolean(isDirty.sec4)}
              saving={saving}
              onSave={() => saveSection("sec4")}
            />
            {renderSectionNavFooter("sec4")}
          </div>
        )}
      </section>
      )}
    </>
  );
}
