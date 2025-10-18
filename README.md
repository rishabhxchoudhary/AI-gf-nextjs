# AI Girlfriend - Next.js Application

A sophisticated AI companion application built with Next.js, TypeScript, tRPC, NextAuth, Hugging Face, and DynamoDB. Experience genuine emotional connections with an AI that remembers, learns, and evolves through your conversations, powered by open-source language models.

## 🌟 Features

### Core Features
- **🧠 Persistent Memory**: AI remembers all conversations and builds on shared history
- **💕 Emotional Intelligence**: Genuine emotional responses and empathy
- **🌟 Dynamic Personality**: 15 evolving personality traits that adapt to interactions
- **📈 Relationship Progression**: Four distinct relationship stages (new → comfortable → intimate → established)
- **⏰ Temporal Awareness**: Different behaviors based on time of day
- **💰 Credit System**: Pay-per-message model with 100 free credits for new users
- **📊 Analytics Dashboard**: Comprehensive user analytics and insights
- **🔐 User Authentication**: Secure authentication via NextAuth with Discord OAuth

### Technical Features
- **Type-safe API**: Built with tRPC for end-to-end type safety
- **Scalable Storage**: DynamoDB single table design with GSIs for optimal performance
- **Real-time Updates**: Reactive UI with optimistic updates
- **Responsive Design**: Beautiful UI with NextUI/HeroUI components
- **Session Management**: Secure session handling with NextAuth

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- AWS Account (for DynamoDB)
- Hugging Face API Token (free tier available)
- Discord OAuth App (for authentication)

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd AI-Gf-NextJS
```

2. **Install dependencies**:
```bash
npm install
# or
bun install
```

3. **Set up environment variables**:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
# NextAuth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000

# Discord OAuth
AUTH_DISCORD_ID=<your-discord-client-id>
AUTH_DISCORD_SECRET=<your-discord-client-secret>

# Hugging Face (Get free token from https://huggingface.co/settings/tokens)
HF_TOKEN=<your-huggingface-token>

# AWS DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
DYNAMODB_TABLE_NAME=ai-girlfriend-table
```

4. **Create DynamoDB Table**:

Create a single table with GSIs in AWS DynamoDB:

**Table Name**: `ai-girlfriend-table`
- **Partition Key**: `pk` (String)
- **Sort Key**: `sk` (String)

**Required GSIs**:
- **GSI1**: `gsi1pk` (partition), `gsi1sk` (sort) - For entity type queries
- **GSI2**: `gsi2pk` (partition), `gsi2sk` (sort) - For user-centric queries

📚 **See [DYNAMODB-SETUP.md](./DYNAMODB-SETUP.md) for detailed setup instructions including AWS Console, CLI, and Terraform options.**

5. **Run the development server**:
```bash
npm run dev
# or
bun dev
```

6. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
AI-Gf-NextJS/
├── src/
│   ├── app/                  # Next.js app router pages
│   │   ├── chat/             # Main chat interface
│   │   ├── dashboard/        # Analytics dashboard
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components
│   │   └── providers.tsx     # Client-side providers
│   ├── lib/                  # Utility libraries
│   │   ├── dynamodb.ts       # DynamoDB client and operations
│   │   └── openai.ts         # OpenAI integration
│   ├── server/              
│   │   ├── api/             
│   │   │   ├── routers/      # tRPC routers
│   │   │   │   ├── aiGirlfriend.ts  # Main AI chat router
│   │   │   │   └── dashboard.ts     # Analytics router
│   │   │   └── root.ts       # Root router
│   │   └── auth/             # NextAuth configuration
│   └── types/                # TypeScript type definitions
│       └── ai-girlfriend.ts  # AI girlfriend types
├── public/                   # Static assets
├── package.json             
└── tsconfig.json            
```

## 🎮 Usage

### For Users

1. **Sign In**: Click "Sign In" and authenticate with Discord
2. **Start Chatting**: Click "Start Chatting with Aria" to begin
3. **Build Relationship**: Continue conversations to deepen your connection
4. **Track Progress**: Watch your relationship stage evolve over time
5. **Manage Credits**: Each message uses 1 credit (100 free credits for new users)

### For Administrators

1. **Access Dashboard**: Navigate to `/dashboard` (currently public)
2. **View Analytics**: Monitor user activity, engagement, and credit usage
3. **User Management**: View all users and their activity status
4. **Real-time Insights**: Track emotional patterns and relationship distributions

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, NextUI/HeroUI
- **Backend**: tRPC, NextAuth, Hugging Face Inference API
- **Database**: AWS DynamoDB (Single Table Design)
- **Authentication**: NextAuth with Discord provider
- **State Management**: React Query (via tRPC)
- **AI Models**: Hugging Face models (Phi-3, Mistral, Llama 2, etc.)

### Data Flow
1. User authenticates via NextAuth (Discord OAuth)
2. User sends message through tRPC mutation
3. Message is processed by Hugging Face models with context
4. Response is generated with personality and relationship state
5. All data is persisted to DynamoDB single table
6. Analytics are tracked for dashboard insights

## 🔧 Configuration

### AI Configuration
Edit `src/lib/huggingface.ts` to adjust:
- Model selection (default: microsoft/Phi-3-mini-4k-instruct - free)
- Available models:
  - **Free**: Phi-3, Mistral-7B, Flan-T5
  - **Pro**: Llama 2 70B, Mixtral 8x7B
- Temperature and other parameters
- Response token limits
- System prompt templates

### Personality Traits
Modify initial traits in `src/server/api/routers/aiGirlfriend.ts`:
- Confidence, empathy, playfulness, etc.
- Trait evolution rates
- Relationship progression thresholds

### Credit System
Adjust in `src/server/api/routers/aiGirlfriend.ts`:
- Initial free credits (default: 100)
- Credits per message (default: 1)
- Maximum message length

## 📊 Database Schema

### Single Table Design with GSIs
The application uses an optimized single table design pattern. All entities are stored in one table with strategic use of partition keys and sort keys.

**Primary Access Patterns**:
- User profile and credits: `PK: USER#{userId}, SK: METADATA/CREDITS`
- Sessions: `PK: USER#{userId}, SK: SESSION#{sessionId}`
- Messages: `PK: SESSION#{sessionId}, SK: MSG#{timestamp}#{messageId}`
- Analytics: `PK: ANALYTICS#{date}, SK: EVENT#{timestamp}#{eventId}`

**GSI Access Patterns**:
- Query all users via GSI1
- Query user sessions and analytics via GSI2
- Filter by entity type and timestamps

📚 **See [DYNAMODB-SETUP.md](./DYNAMODB-SETUP.md) for the complete data model and access patterns.**

## 🚢 Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy

### Manual Deployment
1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm run start
```

## 🔐 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Authentication**: Secure session management with NextAuth
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Content Filtering**: Built-in safety checks for inappropriate content
- **Data Privacy**: User data stored securely in DynamoDB

## 🛟 Troubleshooting

### Common Issues

**"Insufficient credits" error**:
- New users get 100 free credits
- Add more credits through the API (implement payment in production)

**DynamoDB connection errors**:
- Verify AWS credentials in `.env.local`
- Check table names match configuration
- Ensure proper IAM permissions

**OpenAI API errors**:
- Verify API key is valid
- Check API rate limits
- Ensure sufficient OpenAI credits

## 📝 License

Private project - All rights reserved.

## 🤝 Contributing

This is currently a private project. For contribution inquiries, please contact the repository owner.

## 📧 Support

For issues and questions, please open a GitHub issue or contact the development team.

---

Built with ❤️ using Next.js, TypeScript, and AI