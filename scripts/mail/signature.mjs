import { Buffer } from 'node:buffer'
import { signaturePng } from './signature-art.mjs'

const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

export function signedEmail(body) {
  const cid = 'assinatura-guilherme@kohausrealestate.com'
  return {
    text: [body, '', 'Guilherme Coninch · KOHAUS Real Estate', 'guilherme@kohausrealestate.com', '+34 665 32 47 91', 'https://kohausrealestate.com'].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55">${escapeHtml(body).replace(/\r?\n/g,'<br>')}</div>
<div style="margin-top:24px"><img src="cid:${cid}" width="560" alt="Guilherme Coninch | KOHAUS Real Estate | guilherme@kohausrealestate.com | +34 665 32 47 91" style="width:100%;max-width:560px;height:auto;display:block"></div>`,
    attachments: [{
      filename: 'assinatura-guilherme.png', content: Buffer.from(signaturePng, 'base64'),
      cid, contentType: 'image/png', contentDisposition: 'inline',
    }],
  }
}
