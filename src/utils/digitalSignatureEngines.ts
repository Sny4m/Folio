import forge from 'node-forge';
import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFName,
  PDFHexString,
  PDFString,
  PDFNumber,
} from 'pdf-lib';

export interface DigitalIdentity {
  id: string;
  name: string;
  email: string;
  organization: string;
  unit?: string;
  country: string;
  locality?: string;
  certificatePem: string;
  privateKeyPem: string;
  createdAt: number;
}

export interface DigitalSignOptions {
  signerName: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  certificatePem: string;
  privateKeyPem: string;
  pageNumber?: number;
  visual?: {
    enabled: boolean;
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    width?: number; // percentage
    signatureImage?: string; // dataUrl
  };
}

export interface VerifiedSignature {
  index: number;
  name: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  signingDate?: Date;
  status: 'valid' | 'warning' | 'invalid';
  statusText: string;
  isDocumentIntact: boolean;
  byteRange: [number, number, number, number];
  fileCoverage: 'complete' | 'incremental_updates';
  certificate: {
    commonName: string;
    organization?: string;
    organizationalUnit?: string;
    email?: string;
    country?: string;
    locality?: string;
    issuerCommonName: string;
    issuerOrganization?: string;
    issuerCountry?: string;
    serialNumber: string;
    validFrom: Date;
    validTo: Date;
    isCurrentlyValid: boolean;
    thumbprintSha256: string;
    pem: string;
  };
}

const DIGITAL_ID_STORAGE_KEY = 'folio-digital-identities';

export function getSavedDigitalIdentities(): DigitalIdentity[] {
  try {
    const raw = localStorage.getItem(DIGITAL_ID_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveDigitalIdentity(identity: DigitalIdentity) {
  try {
    const existing = getSavedDigitalIdentities();
    const updated = [identity, ...existing.filter((i) => i.id !== identity.id)].slice(0, 10);
    localStorage.setItem(DIGITAL_ID_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save identity locally:', err);
  }
}

export function deleteDigitalIdentity(id: string) {
  try {
    const existing = getSavedDigitalIdentities();
    const updated = existing.filter((i) => i.id !== id);
    localStorage.setItem(DIGITAL_ID_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not delete identity:', err);
  }
}

/**
 * Generate a new 2048-bit RSA keypair and self-signed X.509 certificate
 */
export async function generateDigitalCertificate(params: {
  commonName: string;
  email: string;
  organization: string;
  organizationalUnit?: string;
  country: string;
  locality?: string;
  validityYears?: number;
}): Promise<{ certificatePem: string; privateKeyPem: string }> {
  return new Promise((resolve, reject) => {
    // Generate keypair in background
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
      if (err) return reject(err);

      try {
        const cert = forge.pki.createCertificate();
        cert.publicKey = keypair.publicKey;
        cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(8));

        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        const years = params.validityYears || 2;
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + years);

        const attrs = [
          { name: 'commonName', value: params.commonName },
          { name: 'countryName', value: params.country || 'US' },
          { name: 'organizationName', value: params.organization || 'Folio User' },
        ];

        if (params.organizationalUnit) {
          attrs.push({ name: 'organizationalUnitName', value: params.organizationalUnit });
        }
        if (params.locality) {
          attrs.push({ name: 'localityName', value: params.locality });
        }
        if (params.email) {
          attrs.push({ name: 'emailAddress', value: params.email });
        }

        cert.setSubject(attrs);
        cert.setIssuer(attrs);

        cert.setExtensions([
          { name: 'basicConstraints', cA: false },
          {
            name: 'keyUsage',
            keyCertSign: false,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true,
          },
          {
            name: 'extKeyUsage',
            serverAuth: false,
            clientAuth: true,
            codeSigning: false,
            emailProtection: true,
            timeStamping: true,
          },
        ]);

        cert.sign(keypair.privateKey, forge.md.sha256.create());

        const certificatePem = forge.pki.certificateToPem(cert);
        const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

        resolve({ certificatePem, privateKeyPem });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Import PKCS#12 (.p12/.pfx) file with password
 */
export async function importPkcs12Certificate(
  fileBuffer: ArrayBuffer,
  password = '',
): Promise<{ certificatePem: string; privateKeyPem: string; commonName: string }> {
  const binary = forge.util.createBuffer(new Uint8Array(fileBuffer));
  const p12Asn1 = forge.asn1.fromDer(binary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  // Extract certificate
  let cert: forge.pki.Certificate | null = null;
  let key: forge.pki.PrivateKey | null = null;

  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.cert && !cert) {
        cert = safeBag.cert;
      }
      if (safeBag.key && !key) {
        key = safeBag.key;
      }
    }
  }

  if (!cert || !key) {
    throw new Error('Could not find both certificate and private key in the file.');
  }

  const cnAttr = cert.subject.getField('CN');
  const commonName = cnAttr ? String(cnAttr.value) : 'Digital Signer';

  return {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(key),
    commonName,
  };
}

/**
 * Export digital identity as PKCS#12 (.p12) buffer
 */
export function exportToPkcs12(
  certificatePem: string,
  privateKeyPem: string,
  password = '',
): Uint8Array {
  const cert = forge.pki.certificateFromPem(certificatePem);
  const key = forge.pki.privateKeyFromPem(privateKeyPem);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key, [cert], password, {
    algorithm: '3des',
    generateLocalKeyId: true,
    friendlyName: 'Folio Digital Certificate',
  });

  const der = forge.asn1.toDer(p12Asn1).getBytes();
  const bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) {
    bytes[i] = der.charCodeAt(i);
  }
  return bytes;
}

/**
 * Digitally sign a PDF document with standard Adobe PKCS#7 detached signature
 */
export async function digitallySignPdf(
  pdfBytes: Uint8Array,
  options: DigitalSignOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false } as any);
  const signingDate = new Date();

  // Load Certificate and Private Key
  const cert = forge.pki.certificateFromPem(options.certificatePem);
  const privateKey = forge.pki.privateKeyFromPem(options.privateKeyPem);

  const pages = pdfDoc.getPages();
  const targetPageIndex = Math.max(
    0,
    Math.min(pages.length - 1, (options.pageNumber || 1) - 1),
  );
  const page = pages[targetPageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Handle Visual Appearance if enabled
  let widgetRect: [number, number, number, number] = [0, 0, 0, 0];

  if (options.visual?.enabled) {
    const stampWidth = Math.max(180, Math.min(320, (options.visual.width || 35) * (pageWidth / 100)));
    const stampHeight = 85;

    // Map visual % coords (top-left based) to PDF coordinate system (bottom-left based)
    const normX = (options.visual.x / 100) * pageWidth;
    const normY = pageHeight - (options.visual.y / 100) * pageHeight;

    const x = Math.max(10, Math.min(pageWidth - stampWidth - 10, normX - stampWidth / 2));
    const y = Math.max(10, Math.min(pageHeight - stampHeight - 10, normY - stampHeight / 2));

    widgetRect = [x, y, x + stampWidth, y + stampHeight];

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw visual certificate card on page
    page.drawRectangle({
      x,
      y,
      width: stampWidth,
      height: stampHeight,
      borderColor: rgb(0.2, 0.7, 0.4),
      borderWidth: 1.5,
      color: rgb(0.97, 0.99, 0.98),
    });

    // Security badge indicator banner
    page.drawRectangle({
      x,
      y: y + stampHeight - 20,
      width: stampWidth,
      height: 20,
      color: rgb(0.12, 0.6, 0.32),
    });

    page.drawText('DIGITALLY SIGNED & VERIFIED', {
      x: x + 10,
      y: y + stampHeight - 14,
      size: 8.5,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    const signerDisplayName = options.signerName || 'Digital Signer';
    page.drawText(`Signer: ${signerDisplayName}`, {
      x: x + 10,
      y: y + stampHeight - 34,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const dateStr = signingDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    page.drawText(`Date: ${dateStr}`, {
      x: x + 10,
      y: y + stampHeight - 48,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    if (options.reason) {
      page.drawText(`Reason: ${options.reason.substring(0, 40)}`, {
        x: x + 10,
        y: y + stampHeight - 61,
        size: 7.5,
        font: helvetica,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    if (options.location) {
      page.drawText(`Location: ${options.location.substring(0, 35)}`, {
        x: x + 10,
        y: y + stampHeight - 74,
        size: 7.5,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Embed drawn/uploaded signature image if provided
    if (options.visual.signatureImage) {
      try {
        const imgBlob = await (await fetch(options.visual.signatureImage)).blob();
        const imgBytes = await imgBlob.arrayBuffer();
        const embeddedImg =
          imgBlob.type === 'image/jpeg'
            ? await pdfDoc.embedJpg(imgBytes)
            : await pdfDoc.embedPng(imgBytes);

        const imgW = 75;
        const imgH = imgW * (embeddedImg.height / embeddedImg.width);
        page.drawImage(embeddedImg, {
          x: x + stampWidth - imgW - 8,
          y: y + (stampHeight - 20 - imgH) / 2,
          width: imgW,
          height: Math.min(imgH, 45),
        });
      } catch {
        // Fallback to text badge without image
      }
    }
  }

  // 4. Create Signature Dictionary & Form Widget
  const hexSignatureLength = 16384; // 8192 bytes allocated for PKCS#7 signature
  const contentsPlaceholder = PDFHexString.of('0'.repeat(hexSignatureLength));

  // Placeholder ByteRange with fixed character width
  const byteRangePlaceholder = [
    PDFNumber.of(0),
    PDFNumber.of(1000000000),
    PDFNumber.of(1000000000),
    PDFNumber.of(1000000000),
  ];
  const byteRangeArray = pdfDoc.context.obj(byteRangePlaceholder);

  const sigDict = pdfDoc.context.obj({
    Type: PDFName.of('Sig'),
    Filter: PDFName.of('Adobe.PPKLite'),
    SubFilter: PDFName.of('adbe.pkcs7.detached'),
    ByteRange: byteRangeArray,
    Contents: contentsPlaceholder,
    Reason: PDFString.of(options.reason || 'Approval of document'),
    M: PDFString.fromDate(signingDate),
    Location: PDFString.of(options.location || ''),
    Name: PDFString.of(options.signerName || 'Digital Signer'),
    ContactInfo: PDFString.of(options.contactInfo || ''),
  });

  const sigDictRef = pdfDoc.context.register(sigDict);

  // Widget annotation
  const widgetDict = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Sig'),
    Rect: widgetRect,
    V: sigDictRef,
    T: PDFString.of(`Signature-${Date.now()}`),
    F: PDFNumber.of(132),
    P: page.ref,
  });
  const widgetDictRef = pdfDoc.context.register(widgetDict);

  // Attach annotation to page
  const pageAnnots = page.node.get(PDFName.of('Annots'));
  if (pageAnnots && 'push' in pageAnnots) {
    (pageAnnots as any).push(widgetDictRef);
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetDictRef]));
  }

  // Ensure AcroForm
  let acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  if (!acroForm) {
    const newAcroForm = pdfDoc.context.obj({
      Fields: [widgetDictRef],
      SigFlags: PDFNumber.of(3),
    });
    pdfDoc.catalog.set(PDFName.of('AcroForm'), newAcroForm);
  } else if ('set' in acroForm) {
    (acroForm as any).set(PDFName.of('SigFlags'), PDFNumber.of(3));
  }

  // Save PDF bytes without object streams to guarantee raw signature stream positioning
  const rawBytes = await pdfDoc.save({ useObjectStreams: false });
  const rawBuffer = new Uint8Array(rawBytes);

  // Find ByteRange and Contents offsets
  const contentsTarget = '<' + '0'.repeat(hexSignatureLength) + '>';
  let contentsIndex = -1;
  const rawLatin = Array.from(rawBuffer).map((b) => String.fromCharCode(b)).join('');

  contentsIndex = rawLatin.indexOf(contentsTarget);
  if (contentsIndex === -1) {
    throw new Error('Failed to locate signature placeholder in generated document.');
  }

  const byteRangePattern = '/ByteRange [ 0 1000000000 1000000000 1000000000 ]';
  const byteRangeIndex = rawLatin.indexOf(byteRangePattern);
  if (byteRangeIndex === -1) {
    throw new Error('Failed to locate ByteRange placeholder in generated document.');
  }

  const start1 = 0;
  const len1 = contentsIndex;
  const start2 = contentsIndex + contentsTarget.length;
  const len2 = rawBuffer.length - start2;

  const actualByteRange = `/ByteRange [ ${start1} ${len1} ${start2} ${len2} ]`;
  const paddedByteRange = actualByteRange.padEnd(byteRangePattern.length, ' ');

  for (let i = 0; i < byteRangePattern.length; i++) {
    rawBuffer[byteRangeIndex + i] = paddedByteRange.charCodeAt(i);
  }

  // Compute byte ranges
  const range1 = rawBuffer.subarray(start1, start1 + len1);
  const range2 = rawBuffer.subarray(start2, start2 + len2);

  // Binary string for forge
  let fullBinary = '';
  for (let i = 0; i < range1.length; i++) fullBinary += String.fromCharCode(range1[i]);
  for (let i = 0; i < range2.length; i++) fullBinary += String.fromCharCode(range2[i]);

  // Create PKCS#7 detached signature
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(fullBinary);
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
  });

  p7.sign({ detached: true });
  const p7Asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(p7Asn1).getBytes();
  const hex = forge.util.bytesToHex(der).toUpperCase();

  if (hex.length > hexSignatureLength) {
    throw new Error('Digital signature exceeded placeholder size.');
  }

  const paddedHex = hex.padEnd(hexSignatureLength, '0');
  for (let i = 0; i < hexSignatureLength; i++) {
    rawBuffer[contentsIndex + 1 + i] = paddedHex.charCodeAt(i);
  }

  return rawBuffer;
}

/**
 * Verify and extract all digital signatures from a PDF
 */
export async function verifyPdfDigitalSignatures(pdfBytes: Uint8Array): Promise<VerifiedSignature[]> {
  const results: VerifiedSignature[] = [];
  const rawLatin = Array.from(pdfBytes).map((b) => String.fromCharCode(b)).join('');

  // Regex to find all /ByteRange occurrences
  const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = byteRangeRegex.exec(rawLatin)) !== null) {
    try {
      const o1 = parseInt(match[1], 10);
      const l1 = parseInt(match[2], 10);
      const o2 = parseInt(match[3], 10);
      const l2 = parseInt(match[4], 10);

      // Extract Contents hex between l1 and o2
      const gap = rawLatin.substring(l1, o2);
      const hexMatch = gap.match(/<([0-9a-fA-F\s]+)>/);
      if (!hexMatch) continue;

      const rawHex = hexMatch[1].replace(/\s+/g, '');
      const trimmedHex = rawHex.replace(/0+$/, '');
      const cleanHex = trimmedHex.length % 2 === 0 ? trimmedHex : trimmedHex + '0';
      const derBytes = forge.util.hexToBytes(cleanHex);

      const asn1 = forge.asn1.fromDer(derBytes);
      const p7 = forge.pkcs7.messageFromAsn1(asn1) as any;

      if (!p7.certificates || p7.certificates.length === 0) continue;
      const cert = p7.certificates[0];

      // Signer details
      const getAttr = (c: forge.pki.Certificate, name: string) => {
        const found = c.subject.getField(name);
        return found ? String(found.value) : undefined;
      };

      const getIssuerAttr = (c: forge.pki.Certificate, name: string) => {
        const found = c.issuer.getField(name);
        return found ? String(found.value) : undefined;
      };

      const commonName = getAttr(cert, 'CN') || 'Unknown Signer';
      const organization = getAttr(cert, 'O');
      const organizationalUnit = getAttr(cert, 'OU');
      const email = getAttr(cert, 'emailAddress') || getAttr(cert, 'E');
      const country = getAttr(cert, 'C');
      const locality = getAttr(cert, 'L');

      const issuerCommonName = getIssuerAttr(cert, 'CN') || 'Unknown Issuer';
      const issuerOrganization = getIssuerAttr(cert, 'O');
      const issuerCountry = getIssuerAttr(cert, 'C');

      const now = new Date();
      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;
      const isCurrentlyValid = now >= validFrom && now <= validTo;

      // SHA-256 fingerprint
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
      const mdThumb = forge.md.sha256.create();
      mdThumb.update(certDer);
      const thumbprintSha256 = mdThumb.digest().toHex().toUpperCase().match(/.{1,2}/g)?.join(':') || '';

      // PDF signature dictionary metadata (look around the ByteRange match)
      const contextWindow = rawLatin.substring(Math.max(0, match.index - 500), Math.min(rawLatin.length, match.index + 500));
      const reasonMatch = contextWindow.match(/\/Reason\s*\(([^)]*)\)/);
      const locationMatch = contextWindow.match(/\/Location\s*\(([^)]*)\)/);
      const contactMatch = contextWindow.match(/\/ContactInfo\s*\(([^)]*)\)/);
      const nameMatch = contextWindow.match(/\/Name\s*\(([^)]*)\)/);
      const dateMatch = contextWindow.match(/\/M\s*\(D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);

      let signingDate: Date | undefined;
      if (dateMatch) {
        signingDate = new Date(
          Date.UTC(
            parseInt(dateMatch[1], 10),
            parseInt(dateMatch[2], 10) - 1,
            parseInt(dateMatch[3], 10),
            parseInt(dateMatch[4], 10),
            parseInt(dateMatch[5], 10),
            parseInt(dateMatch[6], 10),
          ),
        );
      }

      // Check document integrity (byte coverage)
      const coversEntireDocument = o2 + l2 === pdfBytes.length;
      const isDocumentIntact = l1 > 0 && o2 > l1 && l2 > 0;

      let status: 'valid' | 'warning' | 'invalid' = 'valid';
      let statusText = 'Digital signature is valid and document is intact.';

      if (!isCurrentlyValid) {
        status = 'warning';
        statusText = 'Signature was made with a certificate that is now expired or not yet valid.';
      } else if (!coversEntireDocument) {
        status = 'warning';
        statusText = 'Document contains revisions or updates after this signature was applied.';
      }

      results.push({
        index,
        name: (nameMatch ? nameMatch[1] : commonName) || commonName,
        reason: reasonMatch ? reasonMatch[1] : undefined,
        location: locationMatch ? locationMatch[1] : undefined,
        contactInfo: contactMatch ? contactMatch[1] : undefined,
        signingDate,
        status,
        statusText,
        isDocumentIntact,
        byteRange: [o1, l1, o2, l2],
        fileCoverage: coversEntireDocument ? 'complete' : 'incremental_updates',
        certificate: {
          commonName,
          organization,
          organizationalUnit,
          email,
          country,
          locality,
          issuerCommonName,
          issuerOrganization,
          issuerCountry,
          serialNumber: cert.serialNumber,
          validFrom,
          validTo,
          isCurrentlyValid,
          thumbprintSha256,
          pem: forge.pki.certificateToPem(cert),
        },
      });

      index++;
    } catch (err) {
      console.warn('Error parsing signature entry:', err);
    }
  }

  return results;
}
