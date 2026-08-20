# Track My Kid School Portal

## Local setup

Create a `.env` file in this project when the API is not running on the default
local port:

```env
VITE_API_URL=http://localhost:3000
VITE_GEOAPIFY_API_KEY=your-geoapify-key
```

The server sends school registration invitations to the URL configured by
`SCHOOL_WEB_APP_URL`. For local development, set it in the server environment:

```env
SCHOOL_WEB_APP_URL=http://localhost:5173
```

The mobile app's school registration form requests the invitation. The email
opens `/register?email=...`, where the school completes registration. After
registration, the school signs in at `/login`.

The registration map uses Geoapify autocomplete, map tiles, reverse geocoding,
and routing. Restrict the Geoapify key to the school portal domain before
deploying.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
