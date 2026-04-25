# Security & Secrets Rules

Protecting the integrity of the project and user data.

## 1. Environment Variables
- **Never Commit Secrets**: Do not commit `.env`, `.env.local`, or any file containing real API keys.
- **Update `.env.example`**: When adding a new environment variable, immediately add it to `.env.example` with a placeholder value.
- **Production Config**: Follow the `README.md` instructions for setting environment variables on a VPS.

## 2. Authentication & Authorization
- **Role Check**: Always verify the user's role (Admin vs Staff) in both API routes and Page layouts.
- **NextAuth Usage**: Use `getServerSession` for server-side auth and `useSession` for client-side.

## 3. Data Protection
- **Client Privacy**: Ensure sensitive client data is only accessible to authorized staff.
- **SQL Injection**: Always use parameterized queries with the `pg` driver. Never concatenate user input into SQL strings.

## 4. External Integrations
- **Google Cloud**: Manage service account keys securely. Never expose them to the client-side.
- **WebRTC**: Ensure signaling servers are protected and only allow connections from authenticated users.
