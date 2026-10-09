import { apiRoute } from "../../../../../lib/api/route";
import { helloRoutes } from "../../../../../lib/api/hello";
import { getHelloService } from "../../../../../lib/composition";

// S0 walking skeleton: GET reads the caller's note, PUT saves it.
export const { GET, PUT } = helloRoutes(apiRoute, getHelloService);
