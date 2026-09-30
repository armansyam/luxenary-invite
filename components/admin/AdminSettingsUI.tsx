import React from "react";

function SettingsCard({
  title,
  description,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  isDirty,
  saveSuccess,
  saveSuccessMessage = "Pengaturan berhasil disimpan",
  viewContent,
  children,
}: {
  title: string;
  description: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  isDirty?: boolean;
  saveSuccess?: boolean;
  saveSuccessMessage?: string;
  viewContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
        isEditing
          ? "border-amber-400 ring-2 ring-amber-400/20"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Ubah</span>
          </button>
        )}
      </div>

      {/* Save Success Banner */}
      {saveSuccess && !isEditing && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Body: View Mode or Edit Mode */}
      {isEditing ? (
        <div className="space-y-4">
          {children}

          {/* Edit Mode Footer Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs">
              {isDirty ? (
                <span className="text-amber-700 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                  Ada perubahan yang belum disimpan
                </span>
              ) : (
                <span className="text-gray-400">Tidak ada perubahan data</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={!isDirty || saving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">{viewContent}</div>
      )}
    </div>
  );
}

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-400 mb-1.5">{description}</p>}
      {children}
    </div>
  );
}


export { SettingsCard, FieldRow };
