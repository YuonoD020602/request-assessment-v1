// Footer kontak admin — dipakai konsisten di semua halaman
export default function FooterContact({ dark = false }) {
  return (
    <div className={`mt-10 pt-4 pb-6 text-center text-xs border-t ${dark ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-400'}`}>
      Ada pertanyaan? Hubungi PIC Asesmen RACD AIHO —{' '}
      <a
        href="mailto:yuono.raharjo@ai.astra.co.id"
        className={`font-medium hover:underline ${dark ? 'text-blue-300' : 'text-blue-600'}`}
      >
        yuono.raharjo@ai.astra.co.id
      </a>
    </div>
  );
}
