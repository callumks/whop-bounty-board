# CBountyBoard

A monetized Whop app that allows creators to launch viral content challenges and reward participants with USD, USDC, or subscription passes. Features a **10% platform fee** monetization model with optional buyout options.

## Features

### Challenge Creation (Creator View)

- **Public & Private Challenges**: Visible to all Whop users or only your customers
- **Multiple Reward Types**: USD (Stripe), USDC (crypto), or Subscription Passes
- **Platform Fee System**: 10% fee with $2 minimum, or $15 buyout option
- **Funding Gates**: Challenges must be pre-funded before going live
- **Rich Challenge Configuration**: Title, description, tags, deadlines, and visibility settings

### User Challenge Participation

- **Browse Active Challenges**: Public challenges + private ones you have access to
- **Easy Submission**: Submit links to your UGC (TikTok, Twitter, Instagram, YouTube, etc.)
- **Real-time Status**: Track submission status (Pending, Approved, Rejected, Paid)

### Content Moderation Panel

- **Manual Review System**: Creators approve/reject submissions manually
- **Rich Moderation Interface**: Preview content with approve/reject actions
- **Automatic Payouts**: Trigger payments when submissions are approved

### Authentication & Gating

- **Whop App Integration**: Embedded as a Whop app with zero authentication required
- **Creator vs Customer**: Automatic role detection via Whop headers
- **Private Challenge Access**: Verify customer access to private challenges based on memberships

## Tech Stack

- **Frontend**: React 18, Next.js 14, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: Railway PostgreSQL with Prisma ORM
- **Authentication**: Whop App Integration (embedded authentication)
- **Payments**:
  - Stripe for USD transactions
  - Mock crypto wallet integration for USDC
  - Whop API for subscription passes
- **UI Components**: Lucide React icons, Custom component library

## Monetization Model

ChallengeHub implements a **10% platform fee** on all challenge rewards:

### Platform Fee Structure

- **Standard Fee**: 10% of reward amount (minimum $2)
- **Buyout Option**: $15 one-time fee to eliminate platform commission
- **Fee Transparency**: Clear breakdown shown to creators before funding

### Revenue Streams

- **Transaction Fees**: 10% commission on every funded challenge
- **Buyout Fees**: $15 per challenge for fee-free rewards
- **Volume Scaling**: Higher-value challenges generate more revenue

### Creator Experience

```
Example: $100 Reward Challenge
┌─────────────────────────────────────┐
│ Standard: $100 → $10 fee → $90 payout │
│ Buyout: $100 + $15 → $100 payout     │
└─────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Whop developer account and app
- Stripe account (for USD payments)

### 1. Clone and Install

```bash
git clone <repository-url>
cd challengehub
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env.local
```

Update `.env.local` with your actual values:

```bash
# Whop App Configuration
WHOP_API_KEY=your_whop_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Next.js Configuration
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Deploy to Railway and add PostgreSQL plugin
2. Set up Prisma and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

3. Your DATABASE_URL will be automatically provided by Railway

### 4. Whop App Configuration

1. Create a new app in the [Whop Developer Dashboard](https://dev.whop.com)
2. Configure your app as an embedded Whop app (no redirect URIs needed)
3. Copy your API Key to your environment variables
4. Set up your app's webhook endpoints for Whop events

### 5. Stripe Setup

1. Create a Stripe account and get your API keys
2. Set up webhooks pointing to: `http://localhost:3000/api/webhooks/stripe`
3. Configure the following webhook events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 6. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see ChallengeHub in action! 🎉

## 📁 Project Structure

```
challengehub/
├── app/                      # Next.js 14 App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── challenges/      # Challenge CRUD operations
│   │   ├── submissions/     # Submission management
│   │   └── payments/        # Payment processing
│   ├── challenges/          # Challenge pages
│   ├── dashboard/           # Creator dashboard
│   └── layout.tsx           # Root layout
├── components/              # Reusable UI components
│   ├── layout/             # Layout components (Navbar, etc.)
│   ├── challenge/          # Challenge-specific components
│   └── ui/                 # Base UI components
├── lib/                    # Utility libraries
│   ├── supabase.ts        # Database client
│   ├── stripe.ts          # Payment processing
│   ├── whop.ts            # Whop API integration
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Helper functions
└── supabase/              # Database schema and migrations
    └── schema.sql         # Complete database schema
```

## 🔧 Key Features Implementation

### Challenge Creation Flow

1. **Creator Authentication**: Verify user is a Whop creator
2. **Challenge Form**: Rich form with validation and preview
3. **Funding Gate**: Challenge created as DRAFT until funded
4. **Payment Processing**: Handle funding via Stripe or crypto
5. **Go Live**: Activate challenge once funding confirmed

### Submission & Moderation

1. **User Submission**: Link-based submission with metadata
2. **Content Preview**: Rich preview in moderation dashboard
3. **Manual Review**: Approve/reject with optional feedback
4. **Automatic Payout**: Trigger payment on approval

### Payment Processing

- **USD**: Stripe payment intents and transfers
- **USDC**: Mock crypto wallet integration (extensible)
- **Subscriptions**: Whop API integration for pass granting

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect to Vercel and import your repository
3. Set environment variables in Vercel dashboard
4. Deploy! Vercel will handle the build and deployment

### Environment Variables for Production

Make sure to update these for production:

```bash
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Database Migration

The database schema in `supabase/schema.sql` includes:

- All tables with proper relationships
- Row Level Security policies
- Indexes for performance
- Triggers for data consistency

## Security Features

- **Row Level Security**: Database-level access control
- **Authentication Middleware**: Protect API routes
- **Input Validation**: Comprehensive form and API validation
- **Payment Security**: Secure webhook verification
- **CORS Configuration**: Proper cross-origin resource sharing

## Analytics & Monitoring

- **Challenge Performance**: Track submissions and engagement
- **Payment Analytics**: Monitor funding and payouts
- **User Behavior**: Track challenge participation
- **Error Monitoring**: Built-in error handling and logging

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed information for faster resolution

## Roadmap

- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Multi-language support
- [ ] Advanced reward types
- [ ] Automated content moderation
- [ ] Creator collaboration features

---

Built with ❤️ for the Whop creator community
