// Server functions to provide the QZ Tray digital signature so the local
// QZ Tray agent treats this site as a trusted origin and stops prompting.
//
// QZ Tray flow:
//  1. Client provides certificate (public) via qz.security.setCertificatePromise
//  2. For each request, QZ sends a payload string ("toSign") that the client
//     must sign with the matching private key. We do that on the server so the
//     private key never leaves the backend.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSign } from "crypto";

const SignSchema = z.object({
  request: z.string().min(1).max(4096),
});

export const getQzCertificate = createServerFn({ method: "GET" }).handler(
  async () => {
    const cert = process.env.QZ_CERTIFICATE;
    if (!cert) throw new Error("QZ_CERTIFICATE not configured");
    return { certificate: cert };
  },
);

export const signQzRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.QZ_PRIVATE_KEY;
    if (!key) throw new Error("QZ_PRIVATE_KEY not configured");
    // QZ Tray default: SHA512withRSA, base64 output.
    const signer = createSign("SHA512");
    signer.update(data.request);
    signer.end();
    const signature = signer.sign(key, "base64");
    return { signature };
  });
