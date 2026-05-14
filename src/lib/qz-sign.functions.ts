import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";

export const getQzCertificate = createServerFn({ method: "GET" }).handler(
  async () => {
    const cert = process.env.QZ_CERTIFICATE;
    if (!cert) return { certificate: null as string | null, configured: false };
    return { certificate: cert, configured: true };
  },
);

export const signQzPayload = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ payload: z.string().min(1).max(20000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.QZ_PRIVATE_KEY;
    if (!key) throw new Error("QZ_PRIVATE_KEY no configurada");
    const signer = crypto.createSign("SHA512");
    signer.update(data.payload);
    signer.end();
    const signature = signer.sign(key, "base64");
    return { signature };
  });

export const getQzCertificateInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    const cert = process.env.QZ_CERTIFICATE;
    const hasKey = !!process.env.QZ_PRIVATE_KEY;
    if (!cert) return { configured: false, hasKey, info: null };
    try {
      const x509 = new crypto.X509Certificate(cert);
      return {
        configured: true,
        hasKey,
        info: {
          subject: x509.subject,
          issuer: x509.issuer,
          validFrom: x509.validFrom,
          validTo: x509.validTo,
          fingerprint: x509.fingerprint256,
        },
      };
    } catch (e: any) {
      return { configured: true, hasKey, info: null, error: e.message };
    }
  },
);
