// Universal constants only. Do not add domain-specific values here.

/** Logical environments a deployment or database can target. */
export const APP_ENVS = ["dev", "qa", "stage", "prod"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Default and maximum page sizes for list endpoints. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
