# NestQuest

NestQuest is a Next.js application designed to help users compare job offers and evaluate their financial impact, including salary, taxes, and living expenses across different locations.

## Features

- Add and manage multiple job offers
- Compare offers side-by-side
- Calculate effective salary after taxes
- Visualize budget breakdown with interactive charts
- Estimate time to achieve Financial Independence, Retire Early (FIRE)
- Compare living costs across different locations

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase Realtime Database
- Clerk for authentication
- Recharts for data visualization
- Azure AI for location comparison insights

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the root directory and add the following variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   AZURE_ENDPOINT=your_azure_endpoint
   GITHUB_TOKEN=your_github_token
   MODEL_NAME=your_azure_model_name
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/components/nest-quest.tsx`: Main component containing the NestQuest application logic
- `src/app/page.tsx`: Entry point of the application
- `src/app/layout.tsx`: Root layout component
- `lib/firebase/index.ts`: Firebase configuration and database operations
- `pages/api/llama.ts`: API route for Azure AI integration

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
