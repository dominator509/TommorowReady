import { createHash } from 'node:crypto';

export type Binder = Readonly<{
  mediaType: 'application/pdf';
  bytes: Buffer;
  checksum: string;
  manifestHash: string;
}>;
export function renderDeterministicBinder(input: {
  householdName: string;
  manifestHash: string;
  sections: readonly string[];
}): Binder {
  const lines = [
    `TomorrowReady Binder`,
    `Household: ${input.householdName}`,
    `Manifest: ${input.manifestHash}`,
    ...input.sections,
  ];
  const escapePdfText = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '?')
      .replace(/([\\()])/g, '\\$1');
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 742 Td',
    ...lines.flatMap((line, index) => [
      ...(index === 0 ? [] : ['0 -18 Td']),
      `(${escapePdfText(line)}) Tj`,
    ]),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let document = '%PDF-1.4\n%TomorrowReady\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('');
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const bytes = Buffer.from(document, 'ascii');
  return {
    mediaType: 'application/pdf',
    bytes,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    manifestHash: input.manifestHash,
  };
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function renderDeterministicMailHtml(input: {
  title: string;
  manifestHash: string;
  sections: readonly string[];
}): Readonly<{ html: string; checksum: string }> {
  const html = [
    '<!doctype html><html><head><meta charset="utf-8"><style>',
    '@page{size:letter;margin:0.75in}body{font-family:Arial,sans-serif;color:#17231d}',
    'h1{font-size:22px}p{font-size:12px;line-height:1.45;white-space:pre-wrap}',
    '</style></head><body>',
    `<h1>${escapeHtml(input.title)}</h1>`,
    `<p>Manifest: ${escapeHtml(input.manifestHash)}</p>`,
    ...input.sections.map((section) => `<p>${escapeHtml(section)}</p>`),
    '</body></html>',
  ].join('');
  return { html, checksum: createHash('sha256').update(html).digest('hex') };
}
