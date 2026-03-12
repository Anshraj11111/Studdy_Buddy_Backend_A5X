# Studdy Buddy Backend Architecture

## Project Overview

Studdy Buddy is a production-ready peer-to-peer robotics learning platform backend built with Node.js, Express, MongoDB, and Redis. The system enables students to post doubts, get automatically matched with peers, collaborate through real-time chat and video calls, share resources, and interact in communities.

**Scale Capacity:**
- 100,000+ registered users
- 5,000+ concurrent users
- Real-time chat rooms with WebRTC signaling
- Optimized for sub-200ms API response times

## Tech Stack

### Core Framework
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication

### Database & Caching
- **MongoDB** - Primary database with Mongoose ODM
- **Redis** - Caching layer and session management

### Authentication & Security
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **CORS** - Cross-origin resource sharing

### Testing
- **Jest** - Test framework
- **fast-check** - Property-based testing
- **supertest** - HTTP assertion library
- **mongodb-memory-server** - In-memory MongoDB for tests

### Utilities
- **compression** - Response compression
- **winston** - Logging (optional)
- **socket.io-redis** - Socket.IO clustering adapter

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── redis.js              # Redis connection
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── doubt.controller.js
│   │   ├── resource.controller.js
│   │   ├── community.controller.js
│   │   └── mentor.controller.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Doubt.js
│   │   ├── Room.js
│   │   ├── Message.js
│   │   ├── Resource.js
│   │   ├── Community.js
│   │   ├── Post.js
│   │   └── MentorRequest.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── doubt.routes.js
│   │   ├── resource.routes.js
│   │   ├── community.routes.js
│   │   └── mentor.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── validation.middleware.js
│   │   └── request-logger.middleware.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── doubt.service.js
│   │   ├── match.service.js
│   │   ├── message.service.js
│   │   ├── room.service.js
│   │   ├── resource.service.js
│   │   ├── community.service.js
│   │   ├── mentor.service.js
│   │   └── cache.service.js
│   ├── sockets/
│   │   ├── chat.socket.js
│   │   └── video.socket.js
│   ├── utils/
│   │   └── logger.js
│   └── app.js                    # Express app configuration
├── tests/
│   ├── properties/               # Property-based tests
│   └── integration/              # Integration tests
├── server.js                     # Server entry point
├── package.json
├── jest.config.js
├── .env
└── .gitignore
```

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique, indexed),
  password: String (hashed),
  role: String (student/mentor),
  skills: [String],
  xp: Number,
  profileImage: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Doubt Model
```javascript
{
  title: String,
  description: String,
  topic: String (indexed),
  tags: [String],
  userId: ObjectId (ref: User, indexed),
  status: String (open/matched/resolved, indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### Room Model
```javascript
{
  student1: ObjectId (ref: User, indexed),
  student2: ObjectId (ref: User, indexed),
  doubt1: ObjectId (ref: Doubt),
  doubt2: ObjectId (ref: Doubt),
  topic: String (indexed),
  status: String (active/completed/abandoned, indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  senderId: ObjectId (ref: User),
  roomId: ObjectId (ref: Room, indexed),
  content: String,
  createdAt: Date (indexed with roomId)
}
```

### Resource Model
```javascript
{
  title: String,
  description: String,
  fileUrl: String,
  fileType: String,
  uploadedBy: ObjectId (ref: User, indexed),
  topic: String (indexed),
  tags: [String],
  downloads: Number,
  rating: Number,
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Community Model
```javascript
{
  name: String,
  description: String,
  topic: String (indexed),
  createdBy: ObjectId (ref: User, indexed),
  members: [ObjectId] (ref: User),
  memberCount: Number,
  isPublic: Boolean,
  icon: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Post Model
```javascript
{
  communityId: ObjectId (ref: Community, indexed),
  userId: ObjectId (ref: User),
  content: String,
  likes: [ObjectId] (ref: User),
  likeCount: Number,
  comments: [{
    userId: ObjectId,
    content: String,
    createdAt: Date
  }],
  commentCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### MentorRequest Model
```javascript
{
  studentId: ObjectId (ref: User),
  roomId: ObjectId (ref: Room),
  mentorId: ObjectId (ref: User),
  status: String (pending/accepted/rejected/completed, indexed),
  message: String,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Doubts
- `POST /api/doubts` - Create doubt (protected)
- `GET /api/doubts` - List doubts with pagination
- `GET /api/doubts/:id` - Get doubt by ID
- `GET /api/doubts/search` - Search doubts
- `GET /api/doubts/topic/:topic` - Get doubts by topic

### Resources
- `POST /api/resources` - Create resource (protected)
- `GET /api/resources` - List resources
- `GET /api/resources/:id` - Get resource by ID
- `GET /api/resources/search` - Search resources
- `GET /api/resources/topic/:topic` - Get resources by topic
- `POST /api/resources/:id/download` - Increment download count (protected)
- `DELETE /api/resources/:id` - Delete resource (protected)

### Communities
- `POST /api/communities` - Create community (protected)
- `GET /api/communities` - List communities
- `GET /api/communities/:id` - Get community by ID
- `POST /api/communities/:id/join` - Join community (protected)
- `POST /api/communities/:id/leave` - Leave community (protected)
- `POST /api/communities/:id/posts` - Create post (protected)
- `GET /api/communities/:id/posts` - Get community posts

### Mentor Requests
- `POST /api/mentor/request` - Create mentor request (protected)
- `GET /api/mentor/requests/pending` - Get pending requests
- `GET /api/mentor/requests` - Get my requests (protected)
- `PUT /api/mentor/requests/:id/accept` - Accept request (protected)
- `PUT /api/mentor/requests/:id/reject` - Reject request (protected)
- `PUT /api/mentor/requests/:id/complete` - Complete request (protected)

### Health Checks
- `GET /health` - Server health
- `GET /health/db` - Database health
- `GET /health/redis` - Redis health

## Authentication Flow

1. **Registration**
   - User submits email, password, name, role
   - Password hashed with bcryptjs (10 rounds)
   - User created in MongoDB
   - JWT token generated and returned

2. **Login**
   - User submits email and password
   - Password compared with stored hash
   - JWT token generated with 24-hour expiration
   - Token returned to client

3. **Protected Routes**
   - Client sends JWT in Authorization header
   - Middleware extracts and verifies token
   - User attached to request object
   - Request proceeds if valid

4. **Token Structure**
   ```javascript
   {
     userId: ObjectId,
     iat: timestamp,
     exp: timestamp + 24 hours
   }
   ```

## Smart Doubt Matching Logic

### Matching Algorithm
1. When a doubt is created, system searches for open doubts with same topic
2. If match found:
   - Create Room with both students
   - Update both doubts to "matched" status
   - Return room details to client
3. If no match:
   - Doubt remains "open"
   - Returned to client with matched: false

### Matching Service Methods
- `findAndMatch(doubtId)` - Find matching doubt and create room
- `createRoom(student1Id, student2Id, doubt1Id, doubt2Id, topic)` - Create collaboration room
- `getRoomById(roomId)` - Retrieve room details
- `getRoomsByUser(userId)` - Get all rooms for user
- `updateRoomStatus(roomId, status)` - Update room status

### Optimization
- Indexed queries on topic and status
- Lean queries to reduce memory
- Pagination for large result sets

## Chat Architecture

### Real-time Communication
- **Socket.IO** for WebSocket connections
- **Redis adapter** for clustering support
- **Message persistence** in MongoDB
- **Typing indicators** for UX

### Chat Events
- `joinRoom` - Join collaboration room
- `sendMessage` - Send message to room
- `typing` - Broadcast typing indicator
- `stopTyping` - Stop typing indicator
- `leaveRoom` - Leave room
- `disconnect` - Handle disconnection

### Message Flow
1. Client connects via Socket.IO
2. Client joins room with roomId and userId
3. Server retrieves last 50 messages
4. Client sends message
5. Server saves to MongoDB
6. Server broadcasts to all room participants
7. Clients receive and display message

### Performance Optimizations
- Message queue size limit (1000)
- Max message length (5000 chars)
- Connection cleanup every 5 minutes
- Stale connection removal (30 min timeout)

## Video Signaling Flow

### WebRTC Signaling
- **Offer/Answer** exchange via Socket.IO
- **ICE Candidates** relay for NAT traversal
- **Call lifecycle** management

### Video Events
- `initiateCall` - Initiate video call
- `incomingCall` - Notify incoming call
- `callAccepted` - Accept call
- `callRejected` - Reject call
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `iceCandidate` - Send ICE candidate
- `callEnded` - End call

### Signaling Process
1. Caller initiates call via Socket.IO
2. Callee receives incomingCall event
3. Callee accepts call
4. Caller sends WebRTC offer
5. Callee sends WebRTC answer
6. Both exchange ICE candidates
7. Peer connection established
8. Video/audio streams flow directly P2P

## Redis Caching Strategy

### Cache Keys
```
user:{userId}                    # User profile data
doubt:list:{page}:{limit}        # Doubt listings
doubt:topic:{topic}:{page}       # Doubts by topic
community:list:{page}:{limit}    # Community listings
room:{roomId}                    # Room details
resource:list:{page}:{limit}     # Resource listings
```

### Cache TTL
- User profiles: 1 hour
- Doubt listings: 5 minutes
- Community listings: 10 minutes
- Room details: 30 minutes
- Resource listings: 15 minutes

### Cache Invalidation
- On user profile update: delete user:{userId}
- On new doubt: delete doubt:list:*, doubt:topic:*
- On community update: delete community:list:*
- On room status change: delete room:{roomId}

### Fallback Strategy
- If Redis unavailable, queries go directly to MongoDB
- No caching, but system remains functional
- Automatic reconnection with exponential backoff

### Cache Service Methods
- `get(key)` - Retrieve from cache
- `set(key, value, ttl)` - Store in cache
- `del(key)` - Delete from cache
- `exists(key)` - Check existence
- `mget(keys)` - Get multiple values
- `mset(data, ttl)` - Set multiple values
- `incr(key, increment)` - Increment counter
- `decr(key, decrement)` - Decrement counter

## Security Hardening

### Authentication & Authorization
- JWT tokens with 24-hour expiration
- bcryptjs password hashing (10 rounds)
- Role-based access control (student/mentor)
- Protected routes require valid JWT

### Rate Limiting
- Global: 100 requests per 15 minutes
- Auth endpoints: 5 attempts per 15 minutes
- Skip successful requests for auth
- Returns 429 Too Many Requests

### Input Validation
- Email format validation
- Password strength requirements (min 6 chars)
- String sanitization (remove <> chars)
- Payload size limits (10MB)
- Required field validation

### Security Headers (Helmet)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

### CORS Configuration
- Allowed origins from environment
- Credentials enabled
- Allowed methods: GET, POST, PUT, DELETE, PATCH
- Allowed headers: Content-Type, Authorization

### Error Handling
- No sensitive data in error messages
- Stack traces only in development
- Structured error responses
- Proper HTTP status codes

## Performance Optimization

### Database Optimization
- Indexes on frequently queried fields
- Lean queries to reduce memory
- Pagination for large datasets
- Connection pooling (min: 5, max: 10)

### API Performance
- Response compression (gzip)
- Lean MongoDB queries
- Pagination (default: 10, max: 100)
- Caching layer for frequent queries
- Sub-200ms response time target

### Memory Management
- Async/await for non-blocking operations
- Stream processing for large files
- Connection cleanup
- Garbage collection optimization

### Event Loop Protection
- No synchronous operations
- Async database queries
- Non-blocking I/O
- Proper error handling

## Logging & Monitoring

### Log Levels
- **ERROR** - Critical errors
- **WARN** - Warnings
- **INFO** - Important events
- **DEBUG** - Detailed debugging

### Logged Events
- Server startup/shutdown
- Database connections
- Authentication attempts
- API requests/responses
- Socket connections/disconnections
- Errors and exceptions

### Log Files
- `logs/error.log` - Error logs
- `logs/warn.log` - Warning logs
- `logs/info.log` - Info logs
- `logs/debug.log` - Debug logs

### Monitoring Endpoints
- `GET /health` - Server health
- `GET /health/db` - Database status
- `GET /health/redis` - Redis status

## Deployment Instructions

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Redis 6.0+
- npm or yarn

### Installation
```bash
cd backend
npm install
```

### Environment Configuration
Create `.env` file:
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/studdy-buddy
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
BCRYPT_ROUNDS=10
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
LOG_LEVEL=info
```

### Running the Server
```bash
# Development
npm run dev

# Production
npm start
```

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: studdy-buddy-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: studdy-buddy-backend
  template:
    metadata:
      labels:
        app: studdy-buddy-backend
    spec:
      containers:
      - name: backend
        image: studdy-buddy-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: mongo-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: cache-credentials
              key: redis-url
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 5000 |
| MONGO_URI | MongoDB connection string | mongodb://localhost:27017/studdy-buddy |
| JWT_SECRET | JWT signing secret | (required) |
| JWT_EXPIRE | JWT expiration time | 24h |
| BCRYPT_ROUNDS | Password hashing rounds | 10 |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 (15 min) |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |
| AUTH_RATE_LIMIT_WINDOW_MS | Auth rate limit window | 900000 (15 min) |
| AUTH_RATE_LIMIT_MAX_REQUESTS | Max auth attempts | 5 |
| LOG_LEVEL | Logging level | info |

## Testing

### Unit Tests
- Service layer tests
- Model validation tests
- Utility function tests

### Property-Based Tests
- Password hashing invariants
- JWT round-trip properties
- Data persistence properties
- Pagination consistency

### Integration Tests
- Complete authentication flow
- Doubt creation and matching
- Chat functionality
- Community operations

### Running Tests
```bash
# All tests with coverage
npm test

# Specific test file
npm test -- auth.service.test.js

# Watch mode
npm run test:watch
```

## Performance Benchmarks

### Target Metrics
- API response time: < 200ms (p95)
- Database query time: < 100ms (p95)
- Socket.IO message latency: < 50ms
- Concurrent connections: 5,000+
- Throughput: 1,000+ requests/sec

### Optimization Techniques
- MongoDB indexing
- Redis caching
- Query optimization
- Connection pooling
- Response compression
- Socket.IO clustering

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check MONGO_URI in .env
- Verify MongoDB is running
- Check network connectivity

**Redis Connection Failed**
- Check REDIS_URL in .env
- Verify Redis is running
- Check port 6379 is accessible

**Socket.IO Connection Issues**
- Check CORS_ORIGIN configuration
- Verify WebSocket support
- Check firewall rules

**High Memory Usage**
- Check for memory leaks in socket handlers
- Verify connection cleanup
- Monitor active connections

**Slow API Responses**
- Check MongoDB indexes
- Verify Redis cache hit rate
- Review query performance
- Check network latency

## Support & Maintenance

### Regular Maintenance
- Monitor logs for errors
- Check health endpoints
- Review performance metrics
- Update dependencies
- Backup database regularly

### Scaling Considerations
- Horizontal scaling with load balancer
- Database replication
- Redis clustering
- Socket.IO clustering with Redis adapter
- CDN for static assets

## License

ISC

## Version

1.0.0
