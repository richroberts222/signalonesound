import type { ApiClient } from "./api-client";
import { HELLO_PATH, helloSchema, type PutHelloInput } from "./hello";

// Typed client for the S0 hello note, shared by web and mobile. Built on the
// shared ApiClient so both clients validate responses with the same schema.
export function createHelloClient(api: ApiClient) {
  return {
    get: () => api.request({ method: "GET", path: HELLO_PATH, schema: helloSchema }),
    put: (input: PutHelloInput) =>
      api.request({ method: "PUT", path: HELLO_PATH, body: input, schema: helloSchema }),
  };
}
