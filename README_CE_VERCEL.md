# Cutting Edge Barbershop - CE-Vercel

A modern Next.js web application for Cutting Edge Barbershop in Plymouth, MA, featuring an integrated AI-powered digital concierge with both chat and voice interfaces.

## 🚀 Features

- **Modern Landing Page**: Beautiful, responsive design showcasing the barbershop
- **AI Digital Concierge**: Chat interface powered by Google Gemini 2.0 Flash
- **Floating Action Button**: Quick access to concierge from any page
- **Voice Mode Ready**: Infrastructure for voice interactions (coming soon)
- **Real-time Chat**: Streaming responses with markdown support
- **Mobile Responsive**: Optimized for all devices

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.5 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Google Gemini 2.0 Flash
- **Markdown**: react-markdown
- **TypeScript**: Full type safety

## 📋 Prerequisites

- Node.js 18.17.0 or higher
- npm or yarn package manager
- Google Gemini API key ([Get one here](https://ai.google.dev/))

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd CuttingEdge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Gemini API Key
   NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_API_KEY=your_actual_api_key_here
   ```

   **Important**: Replace `your_actual_api_key_here` with your actual Gemini API key.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage with barbershop content
│   └── globals.css         # Global styles
├── components/
│   ├── concierge/
│   │   ├── types.ts        # TypeScript types
│   │   ├── constants.ts    # Chatbot system prompts
│   │   ├── geminiService.ts # Gemini API integration
│   │   ├── ChatMessage.tsx # Individual chat message
│   │   ├── ChatInterface.tsx # Full chat UI
│   │   ├── VoiceVisualizer.tsx # Voice activity visualizer
│   │   ├── ConciergeModal.tsx # Modal wrapper
│   │   └── FloatingConciergeButton.tsx # Floating action button
│   └── ui/                 # Reusable UI components
└── lib/
    └── utils.ts            # Utility functions
```

## 🎨 Components

### FloatingConciergeButton
A floating action button in the bottom-right corner that opens the concierge modal.

### ConciergeModal
A modal dialog containing both chat and voice interfaces with tab switching.

### ChatInterface
Full-featured chat component with:
- Real-time message streaming
- Markdown rendering
- Auto-scroll
- Loading states
- Input validation

### VoiceVisualizer
Audio visualization component for voice mode (demo implementation).

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `GEMINI_API_KEY` | Server-side version of the API key | Yes |

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 🌐 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set environment variables in Vercel dashboard**
   - Go to your project settings
   - Add `NEXT_PUBLIC_GEMINI_API_KEY` and `GEMINI_API_KEY`
   - Use your actual Gemini API key

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **The output will be in `.next/` directory**

3. **Upload to your hosting provider**

## 🎯 Usage

### For Visitors

1. **Browse the landing page** to learn about services, hours, and location
2. **Click the floating button** (bottom-right) to open the concierge
3. **Choose Chat or Voice mode**
4. **Ask questions** like:
   - "What are your hours?"
   - "How much for a fade?"
   - "Is Jay available today?"
   - "Book me an appointment"

### For Developers

- **Customize the AI**: Edit `src/components/concierge/constants.ts` to change the bot's personality and knowledge
- **Modify the UI**: Components are modular and can be customized
- **Add features**: The project is set up for easy extension

## 🤖 AI Configuration

The chatbot is configured in `constants.ts`:

- **System Instruction**: Defines the bot's personality and behavior
- **Tools**: Available functions (availability checking, lead capture)
- **Context**: Barbershop information, pricing, roster

## 🔧 Troubleshooting

### Chat not working
- Verify your Gemini API key is correct
- Check the browser console for errors
- Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set in `.env.local`

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (must be 18.17.0+)
- Clear `.next` cache: `rm -rf .next`

### Styling issues
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.ts` for theme customization

## 📄 License

This project is proprietary software for Cutting Edge Barbershop.

## 👥 Contact

For support or questions, contact the development team.

---

**Built with ❤️ for Cutting Edge Barbershop**
