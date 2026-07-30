import { useSyncExternalStore } from "react";

/**
 * UI language.
 *
 * Only the interface is translated. The generated prompt stays in English on
 * purpose: it is written for a video model, not a reader, and the wording is
 * tuned against those models. Translating it would change what gets rendered,
 * which is a different decision from what language the buttons are in.
 */
export type Lang = "en" | "id";

const STORAGE_KEY = "pfv.lang.v1";

function initial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") return saved;
    // Fall back to the browser's preference rather than assuming English.
    if (navigator.language?.toLowerCase().startsWith("id")) return "id";
  } catch {
    /* storage or navigator may be unavailable */
  }
  return "en";
}

let current: Lang = initial();
const listeners = new Set<() => void>();

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage may be unavailable */
  }
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Indonesian strings. A missing key falls back to the English default. */
const ID: Record<string, string> = {
  // shell / tabs
  "tab.visual": "Kontrol Visual",
  "tab.json": "JSON Mentah",
  "tab.validate": "Validasi",
  "tab.export": "Ekspor",
  "editor.empty": "Generate sebuah project untuk meninjau dan mengedit Universal JSON di sini.",

  // source
  "source.attach": "Lampirkan video sumber",
  "source.optional": "opsional",
  "source.remove": "Hapus video",
  "source.unsupported": "Format tidak didukung",
  "source.tooLarge": "Ukuran file melebihi batas 500 MB.",
  "source.unreadable": "Video ini tidak terbaca — kemungkinan filenya rusak.",

  // transcript
  "transcript.label": "Transkrip",
  "transcript.manual": "Terkunci Manual",
  "transcript.auto": "Otomatis dari Suara",
  "transcript.none": "Tidak Ada",
  "transcript.lockedChip": "🔒 TRANSKRIP TERKUNCI",
  "transcript.lockedHint": "AI tidak bisa menulis ulang teks ini.",
  "transcript.manualHelp":
    "Jalur paling andal: ketik persis apa yang diucapkan di video. Teks ini diletakkan di bagian paling akhir prompt, tempat kalimat lisan paling konsisten mendarat.",
  "transcript.placeholder": "Tempel dialog persisnya…",
  "transcript.langPlaceholder": "Kode bahasa (mis. id, en) — opsional",
  "transcript.autoReady":
    "Audio ditranskrip saat Generate, dan pembicara dipisah berdasarkan suara. Timing-nya perkiraan model, bukan forced alignment, jadi caption bisa meleset sepersekian detik — untuk kecocokan kata per kata gunakan Terkunci Manual. Perlu video, dan artikulasi yang jelas sangat meningkatkan hasilnya.",
  "transcript.noneHelp":
    "Tidak ada caption atau kinetic typography yang dibuat, karena tidak ada dialog untuk dikutip.",
  "transcript.noVideo": "⚠ Belum ada video — tidak ada audio untuk ditranskrip.",

  // characters
  "char.title": "Karakter",
  "char.add": "＋ Tambah karakter",
  "char.help":
    "Deskripsikan siapa pun yang harus dikarang model, bukan dipertahankan. Pilih template untuk mulai lalu edit — atau tulis sendiri. Mengunci karakter menuntut wajah dan pakaian yang sama di setiap shot; video generatif bergeser kalau tidak.",
  "char.none": "Belum ada. Prompt tidak akan menyebutkan siapa yang muncul di layar.",
  "char.reuse": "Pakai ulang karakter",
  "char.pick": "Pilih karakter…",
  "char.shipped": "Bawaan aplikasi",
  "char.savedHere": "Tersimpan di browser ini",
  "char.export": "⭳ Ekspor library",
  "char.import": "⭱ Impor",
  "char.template": "Mulai dari template…",
  "char.namePlaceholder": "Nama",
  "char.appearancePlaceholder": "Rupa — perawakan, rambut, penampilan, ekspresi. Wajib.",
  "char.appearanceMissing":
    "⚠ Tanpa rupa, karakter ini dilewati — kalau tidak, model menggambar siapa saja sesukanya.",
  "char.gender": "Gender",
  "char.ethnicity": "Etnis / ras",
  "char.skin": "Warna kulit",
  "char.eyes": "Warna mata",
  "char.hair": "Rambut / penutup kepala",
  "char.hairPlaceholder": "pilih atau ketik — warna, panjang, tekstur, atau gaya hijab",
  "char.pickOrType": "pilih atau ketik",
  "char.features": "Ciri khas — bekas luka, tahi lalat, kacamata, tato (opsional)",
  "char.rolePlaceholder": "Peran (opsional)",
  "char.agePlaceholder": "Rentang umur (opsional)",
  "char.wardrobePlaceholder": "Pakaian (opsional)",
  "char.voicePlaceholder": "Suara (opsional)",
  "char.mannerismsPlaceholder": "Gestur / cara membawa diri (opsional)",
  "char.seedPlaceholder": "Seed yang menghasilkan wajah ini (opsional) — pakai di semua clip",
  "char.lock": "Kunci antar shot",
  "char.onCamera": "Apakah ini orang yang ada di video?",
  "char.notOnCamera": "Bukan — orang lain yang di-generate",
  "char.copySheet": "⧉ Salin character sheet",
  "char.copied": "✓ Tersalin",
  "char.save": "☆ Simpan ke library",
  "char.saved": "✓ Tersimpan",
  "char.driftWarn":
    "belum diisi — model mengacak ulang apa pun yang tidak disebut, jadi ini akan bergeser antar clip.",

  // instructions / preset
  "instructions.label": "Instruksi Editing",
  "instructions.placeholder": "Jelaskan bagaimana video ini ingin diedit…",
  "preset.label": "Preset Editing",
  "preset.recommended": "✨ Rekomendasi AI:",
  "preset.use": "Pakai",
  "customStyle.label": "Gaya Kustom (opsional)",

  // generate
  "generate.button": "⚡ Generate Universal JSON",
  "generate.retry": "coba lagi",
  "state.uploading": "Mengunggah…",
  "state.extracting_audio": "Mengekstrak Audio…",
  "state.analyzing_vocal": "Menganalisis Suara…",
  "state.transcribing": "Mentranskrip…",
  "state.detecting_speakers": "Mendeteksi Pembicara…",
  "state.analyzing_scenes": "Menganalisis Scene…",
  "state.understanding_content": "Memahami Konten…",
  "state.building_timeline": "Menyusun Timeline…",
  "state.generating_json": "Membuat JSON…",
  "state.validating": "Memvalidasi…",
  "state.complete": "Selesai",
  "state.error": "Error",

  // validation / export
  "validate.run": "✓ Validasi JSON",
  "validate.fixAll": "⚡ Perbaiki {n} masalah aman",
  "validate.removesContent": "Menghapus konten — ",
  "export.copyJson": "Salin Universal JSON",
  "export.download": "Unduh .json",
  "export.copyPrompt": "Salin Prompt",
  "export.copied": "✓ Tersalin",
  "preview.title": "👁 Pratinjau prompt — baca dulu sebelum menyalin",
  "preview.note":
    "Judul bagian hanya label untuk dibaca — tidak ikut ter-salin ke dalam prompt.",
};

const DICTS: Record<Lang, Record<string, string>> = { en: {}, id: ID };

/**
 * Translate. The key doubles as the English string, so an untranslated key
 * degrades to readable English rather than to a raw identifier on screen.
 */
export function translate(lang: Lang, key: string, fallback: string): string {
  return DICTS[lang][key] ?? fallback;
}

export function useLang(): {
  lang: Lang;
  t: (key: string, fallback: string) => string;
  setLang: (l: Lang) => void;
} {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return {
    lang,
    t: (key, fallback) => translate(lang, key, fallback),
    setLang,
  };
}
