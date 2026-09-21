import fs from 'fs';

const updates = {
  en: {
    story1:
      'I originally came to Lombok looking for opportunities for myself, moving from the UK with my partner and daughter.',
    story2:
      'After buying land in Are Guling and going through the process personally, from finding land and ownership structures to notaries, due diligence, zoning, architects and builders, I began building relationships with local landowners, developers and professionals across South Lombok.',
    story4:
      'Today, I personally visit and select the opportunities we represent, from individual building plots and villas to larger land and development opportunities.',
  },
  id: {
    story1:
      'Awalnya saya datang ke Lombok untuk mencari peluang bagi diri saya sendiri, pindah dari Inggris bersama pasangan dan putri saya.',
    story2:
      'Setelah membeli tanah di Are Guling dan menjalani prosesnya secara langsung, dari mencari tanah dan struktur kepemilikan hingga notaris, due diligence, zonasi, arsitek dan pembangun, saya mulai membangun hubungan dengan pemilik lahan, pengembang, dan profesional lokal di Selatan Lombok.',
    story4:
      'Hari ini, saya pribadi mengunjungi dan memilih peluang yang kami wakili, dari kavling bangunan dan vila hingga lahan yang lebih luas serta peluang pengembangan.',
  },
  nl: {
    story1:
      'Ik kwam oorspronkelijk naar Lombok op zoek naar kansen voor mezelf, samen met mijn partner en dochter verhuisd vanuit het Verenigd Koninkrijk.',
    story2:
      "Na het kopen van grond in Are Guling en het persoonlijk doorlopen van het proces, van grond vinden en eigendomsstructuren tot notarissen, due diligence, zoning, architecten en bouwers, begon ik relaties op te bouwen met lokale landeigenaren, ontwikkelaars en professionals in Zuid-Lombok.",
    story4:
      "Vandaag bezoek en selecteer ik persoonlijk de kansen die we vertegenwoordigen, van individuele bouwpercelen en villa's tot grotere grond- en ontwikkelingsmogelijkheden.",
  },
  es: {
    story1:
      'Originalmente llegué a Lombok buscando oportunidades para mí, mudándome desde el Reino Unido con mi pareja y mi hija.',
    story2:
      'Tras comprar terreno en Are Guling y vivir el proceso en primera persona, desde encontrar terreno y estructuras de propiedad hasta notarios, due diligence, zonificación, arquitectos y constructores, empecé a construir relaciones con propietarios, promotores y profesionales locales en el sur de Lombok.',
    story4:
      'Hoy visito y selecciono personalmente las oportunidades que representamos, desde parcelas individuales y villas hasta terrenos mayores y oportunidades de desarrollo.',
  },
};

for (const [lang, stories] of Object.entries(updates)) {
  const path = `src/lib/i18n/translations/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  Object.assign(data.founder, stories);
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  const blob = JSON.stringify(data.founder);
  console.log(lang, 'emdash?', blob.includes('\u2014'), 'hyphen-stripe?', / — /.test(blob));
}
