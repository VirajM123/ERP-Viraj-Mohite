# Security Operations

- Rotate the MongoDB credential that was previously tracked and review Git history exposure.
- Generate a random production `JWT_SECRET` of at least 32 characters and store it in the deployment secret manager.
- Set `CORS_ORIGINS` explicitly for production domains.
- Review authentication failures, permission changes and financial cancellation audit events.
- Run frontend and backend `npm audit --omit=dev` in CI; assess before applying dependency updates.
