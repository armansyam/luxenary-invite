import fs from 'fs';
import path from 'path';

const checkoutPath = path.join(process.cwd(), 'app/checkout/page.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

// 1. Add statusModal state
content = content.replace(
  'const [qrisTotalDuration, setQrisTotalDuration] = useState<number>(0);',
  'const [qrisTotalDuration, setQrisTotalDuration] = useState<number>(0);\n  const [isCheckingStatus, setIsCheckingStatus] = useState(false);\n  const [statusModal, setStatusModal] = useState<{ show: boolean; title?: string; message: string; isError?: boolean }>({ show: false, message: "" });'
);

// 2. Fix initializeCheckout settings fetch
content = content.replace(
  /if \(settings\.paymentMode\) \{[\s\S]*?\}\s*setBankInfo/g,
  `if (settings.paymentMode) {
        const mode = settings.paymentMode === "BOTH" ? "GATEWAY" : settings.paymentMode;
        setPaymentMode(mode);
        setSelectedMethod(mode);
      }

      setBankInfo`
);

// 3. Re-add status checking logic (handleCheckStatus) - wait, where was it?
// We will just replace the old handleCheckStatus
const oldCheckStatusRegex = /\/\/ Manual Check Status Handler[\s\S]*?const handleCheckStatus = async \(\) => \{[\s\S]*?\}\s*catch[^}]*\}\s*\};/;
const newCheckStatus = `// Manual Check Status Handler
  const handleCheckStatus = async () => {
    if (!orderId) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch(\`/api/client/orders/\${orderId}/status\`, { cache: "no-store" });
      const data = await res.json();
      setIsCheckingStatus(false);
      
      if (data.status === "PAID") {
        if (currentOrderType === "GALLERY_EXTENSION") {
          router.replace("/dashboard?msg=gallery_extended");
        } else {
          router.replace(\`/dashboard/setup?order=\${orderId}&plan=\${data.planType}\`);
        }
      } else if (data.status === "FAILED" || data.status === "REJECTED") {
        setUploadedProofUrl(null);
        setUploadSuccessMsg(null);
        setProofFile(null);
        setProofPreview(null);
        setStatusModal({
          show: true,
          title: "Bukti Ditolak Admin",
          message: \`Alasan: \${data.rejectReason || "Tidak valid"}.\\nSilakan unggah ulang bukti yang benar.\`,
          isError: true
        });
      } else {
        setStatusModal({
          show: true,
          title: "Pembayaran Pending",
          message: "Status pembayaran masih pending. Silakan tunggu admin memverifikasi bukti transfer Anda atau kembali lagi nanti.",
          isError: false
        });
      }
    } catch {
      setIsCheckingStatus(false);
      setStatusModal({
        show: true,
        title: "Kesalahan Jaringan",
        message: "Gagal mengecek status pembayaran. Silakan coba lagi nanti.",
        isError: true
      });
    }
  };`;
content = content.replace(oldCheckStatusRegex, newCheckStatus);

// 4. Update the "Cek Status" button to use isCheckingStatus
content = content.replace(
  /<button\s+type="button"\s+onClick=\{handleCheckStatus\}[\s\S]*?<\/button>/,
  `<button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isCheckingStatus}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-[11px] transition shadow-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCheckingStatus ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-stone-950" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Mengecek...</span>
                          </>
                        ) : (
                          <span>Cek Status Pembayaran ⟳</span>
                        )}
                      </button>`
);

// 5. Add status modal to the bottom of the JSX
const modalJsx = `
      {/* Custom Status Modal */}
      {statusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl transform scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={\`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 \${statusModal.isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}\`}>
              {statusModal.isError ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{statusModal.title}</h3>
            <p className="text-stone-300 text-sm whitespace-pre-line mb-6">{statusModal.message}</p>
            <button
              onClick={() => setStatusModal({ show: false, message: "" })}
              className="w-full py-2.5 bg-white hover:bg-stone-200 text-stone-900 font-bold rounded-xl text-sm transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`;
content = content.replace(/<\/div>\s*\);\s*\}\s*export default function CheckoutPage/g, modalJsx + '\nexport default function CheckoutPage');

// 6. Remove Tab Switcher
content = content.replace(/\{\/\* Payment Method Switcher Tabs[\s\S]*?<\/div>\n\s*\)\}/, '');

// 7. Update Tab 1 rendering condition
content = content.replace(/\{\(paymentMode === "GATEWAY" \|\| \(paymentMode === "BOTH" && selectedMethod === "GATEWAY"\)\) && \(/, '{paymentMode === "GATEWAY" && (');

// 8. Update Tab 2 rendering condition
content = content.replace(/\{\(paymentMode === "MANUAL" \|\| \(paymentMode === "BOTH" && selectedMethod === "MANUAL"\)\) && \(/, '{paymentMode === "MANUAL" && (');

fs.writeFileSync(checkoutPath, content);
console.log('Checkout page refactored');
