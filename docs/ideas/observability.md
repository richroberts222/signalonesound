# Observability (Idea)

Not a requirement. See `README.md`. Keep the architecture vendor-neutral. Do not commit to Splunk or any other vendor; evaluate current free/low-cost and appropriate options only when implementation is authorized.

## Areas to evaluate

* application logs
* errors
* traces
* performance
* API failures
* frontend failures
* workflow-level health

## Constraints for any future work

* Applies to Web, Android, iPhone, and the API consistently.
* Follow `/docs/security.md`: never log secrets, tokens, connection strings, or unnecessary personal data.
* Prefer standard, portable instrumentation so a backend can be swapped.
* Production telemetry is not added without an explicit issue.
