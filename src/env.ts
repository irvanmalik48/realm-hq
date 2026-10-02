import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    GRPC_API_URL: z.string().optional(),
    API_TOKEN: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPERADMIN_EMAILS: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_NAME: z.string().default("Realm HQ"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  },
});
