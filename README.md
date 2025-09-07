# MUTT - Multi-User Text Terminal

A real-time AI chat application built with Next.js, featuring a retro terminal interface and integrated AI assistant powered by Llama.cpp.

## Features

- **Terminal-style Interface**: Authentic green-on-black terminal aesthetic with scanline effects
- **Real-time Communication**: Server-Sent Events (SSE) for instant message updates
- **AI Integration**: Powered by Llama.cpp API for intelligent responses
- **Multi-user Support**: Multiple users can chat simultaneously
- **Persistent Storage**: PostgreSQL database for message history
- **Automatic Message Management**: Intelligent trimming to maintain 10,000-word conversation limit
- **Containerised Deployment**: Docker and Kubernetes ready

## Architecture

### Frontend
- **Next.js 14**: React-based framework with App Router
- **TypeScript**: Type-safe development
- **CSS**: Custom terminal styling with responsive design
- **Real-time Updates**: EventSource API for live message streaming

### Backend
- **Next.js API Routes**: RESTful endpoints and streaming responses
- **PostgreSQL**: Persistent message storage
- **Llama.cpp Integration**: AI model inference via HTTP API
- **Event-driven Architecture**: Real-time message broadcasting

### Infrastructure
- **Docker**: Containerised application
- **Kubernetes**: Orchestrated deployment with K3s

## API Endpoints

- `GET /mutt/api/messages/` - Retrieve conversation history
- `POST /mutt/api/chat/` - Send message and stream AI response
- `GET /mutt/api/events/` - Server-Sent Events for real-time updates
- `GET /mutt/api/health/` - Health check endpoint
- `GET /mutt/api/test/` - Basic connectivity test

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Llama.cpp server running on `http://192.168.1.240:8080`
- Docker (for containerised deployment)
- Kubernetes cluster (for production deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mutt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Ensure PostgreSQL is running with database `postgres`
   - Update Llama.cpp API URL in `lib/llamaCppApi.ts` if needed

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access application**
   - Open `http://localhost:3000/mutt/`

### Production Deployment

1. **Build Docker image**
   ```bash
   ```

2. **Deploy to Kubernetes**
   ```bash
   ```

3. **Access application**

## Configuration

### Database Connection
The application connects to PostgreSQL using these settings:
- Host: `postgres`
- Database: `postgres`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

### Llama.cpp API
Configure the AI model endpoint in `lib/llamaCppApi.ts`:
```typescript
constructor(baseUrl: string = "http://192.168.1.240:8080")
```

### Message Management
- **Word Limit**: 10,000 words maximum in conversation history
- **Trimming Strategy**: Removes oldest user/assistant message pairs
- **Minimum Messages**: Maintains at least 2 messages in history

## Usage

### Basic Chat
1. Navigate to the application URL
2. Type your message in the input field
3. Press Enter or click SEND
4. Watch the AI response stream in real-time

### Multi-user Features
- Each user gets a unique identifier
- Messages from other users are prefixed with their ID
- Real-time updates show all user interactions

### Terminal Commands
The interface supports standard terminal-style interaction:
- Enter: Send message
- Shift+Enter: New line in message
- Auto-resizing text area for longer messages

## Development

### Project Structure
```
├── app/
│   ├── api/           # Next.js API routes
│   ├── globals.css    # Terminal styling
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main chat interface
├── lib/
│   ├── chatStore.ts   # Message storage and management
│   ├── chatTemplate.ts # AI prompt formatting
│   ├── eventEmitter.ts # Real-time event handling
│   └── llamaCppApi.ts  # AI model integration
├── Dockerfile         # Container configuration
├── mutt.yaml         # Kubernetes deployment
└── next.config.js    # Next.js configuration
```

### Key Components

**ChatStore**: Manages message persistence, word counting, and automatic trimming
**EventEmitter**: Handles real-time message broadcasting between users
**Chat Template**: Formats conversation history for AI model consumption
**Llama.cpp API**: Streams AI responses with proper error handling

## Monitoring

### Health Checks
- Endpoint: `GET /mutt/api/health/`
- Returns: Process info, message count, processing state

### Logging
- Comprehensive console logging for debugging
- Process ID tracking for multi-instance deployments
- Request/response logging for API endpoints

### Kubernetes Monitoring
```bash
# Check pod status
kubectl get pods -l app=mutt-app

# View logs
kubectl logs -l app=mutt-app --tail=50

# Check service
kubectl get svc mutt-app-service
```

## Troubleshooting

### Common Issues

**Empty message history**: Check database connectivity and ChatStore initialisation logs

**AI not responding**: Verify Llama.cpp server is running and accessible

**Real-time updates not working**: Check EventSource connection and SSE endpoint

**Multiple instances**: Ensure only one deployment is active to avoid message sync issues

### Debug Information
The `/mutt/api/messages/` endpoint includes debug information:
- Process ID
- Hostname
- Environment
- Message count
- Node.js version

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
