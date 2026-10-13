// Finds, or creates, the Clerk DEVELOPMENT test user that the browser tests sign in as an admin, and prints its id.
// playwright.config.ts runs this and gives the id to the test server as ADMIN_USER_IDS, so the account is an admin
// only while the tests run. The phone number is one of Clerk's reserved fictional test numbers (the instance requires one). It refuses anything but a Clerk test key (sk_test_), so it can never touch production.
//   usage: node e2e/admin-account.mjs <email> [test phone number]   (the Clerk test key is given on standard input, never on the command line)
const email = process.argv[2];
const phone = process.argv[3] ?? "+12015550142";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const key = Buffer.concat(chunks).toString("utf8").trim();
if (!email || !key.startsWith("sk_test_")) {
  console.error("admin-account: needs an email and a Clerk test key (sk_test_); refusing.");
  process.exit(2);
}

const call = async (path, init = {}) => {
  const res = await fetch(`https://api.clerk.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } });
  if (!res.ok) {
    const detail = await res.json().then((b) => (b.errors ?? []).map((e) => e.long_message ?? e.message).join("; "), () => "");
    throw new Error(`Clerk answered ${res.status} for ${init.method ?? "GET"} ${path.split("?")[0]}: ${detail}`);
  }
  return res.json();
};

const found = await call(`/users?email_address=${encodeURIComponent(email)}`);
if (Array.isArray(found) && found.length > 0) {
  console.log(found[0].id);
} else {
  const created = await call("/users", { method: "POST", body: JSON.stringify({ email_address: [email], first_name: "E2E", last_name: "Admin", skip_password_requirement: true, phone_number: [phone] }) });
  console.log(created.id);
}
