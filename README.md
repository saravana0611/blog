# TechBlog - Technical Discussion Platform

A complete, full-stack blog platform designed to function like a social media site focused on technical discussions. Built with Node.js, Express, PostgreSQL, and React.

## 🚀 Features

### Core Functionality
- **User Authentication & Profiles**: Secure JWT-based authentication with user profiles
- **Content Management**: Create, edit, and delete technical blog posts with Markdown support
- **Social Features**: Like posts, comment threads, user following, and bookmarks
- **Real-time Updates**: WebSocket integration for live post and comment updates
- **Search & Discovery**: Advanced search across posts, users, tags, and comments
- **Content Organization**: Categories, tags, and trending sections

### Advanced Features
- **Markdown Support**: Rich text editing with code syntax highlighting
- **Image Uploads**: Support for featured images and inline media
- **Moderation Tools**: Admin panel for content review and user management
- **Spam Prevention**: Rate limiting and content filtering
- **Responsive Design**: Mobile-first, modern UI built with Tailwind CSS

### Technical Features
- **RESTful API**: Secure endpoints with token-based authentication
- **Database Optimization**: Fast search and trending calculations
- **Real-time Communication**: Socket.io for live updates
- **Scalable Architecture**: Modular design for easy feature additions

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with advanced indexing
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: Socket.io for WebSocket communication
- **File Handling**: Multer for uploads, Sharp for image processing
- **Security**: Helmet, CORS, rate limiting, input validation

### Frontend
- **Framework**: React 18 with React Router
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS with custom components
- **Forms**: React Hook Form with validation
- **UI Components**: Headless UI, Heroicons, Framer Motion
- **Real-time**: Socket.io client integration

## 📋 Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd blog
```

### 2. Install Dependencies
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install separately:
npm install                    # Backend dependencies
cd client && npm install      # Frontend dependencies
```

### 3. Environment Setup
```bash
# Copy environment file
cp .env.development .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tech_blog_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=admin_password_here
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb tech_blog_db

# Run migrations and seed data
npm run db:migrate
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start separately:
npm run server:dev    # Backend on port 5000
npm run client:dev    # Frontend on port 3000
```

## 🗄️ Database Schema

The platform uses a comprehensive database schema with the following main tables:

- **users**: User accounts and profiles
- **posts**: Blog posts with content and metadata
- **comments**: Nested comment system
- **tags**: Post categorization
- **categories**: Content organization
- **likes**: Post and comment likes
- **follows**: User relationships
- **bookmarks**: User saved posts
- **reports**: Content moderation
- **notifications**: User notifications
- **user_sessions**: Token management
- **search_history**: Search analytics

## 🔐 Authentication & Security

- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request throttling
- **Input Validation**: Express-validator for all inputs
- **XSS Protection**: Content sanitization
- **CORS**: Configurable cross-origin policies
- **Security Headers**: Helmet.js integration

## 📱 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

### Posts
- `GET /posts` - List posts with filters
- `POST /posts` - Create new post
- `GET /posts/:slug` - Get post by slug
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post

### Comments
- `GET /comments/post/:postId` - Get post comments
- `POST /comments` - Create comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

### Users
- `GET /users/profile/:username` - Get user profile
- `PUT /users/profile` - Update profile
- `POST /users/follow/:username` - Follow user
- `GET /users/:username/posts` - Get user posts

### Search
- `GET /search` - Global search
- `GET /search/suggestions` - Search autocomplete
- `GET /search/trending` - Trending searches

### Admin
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/posts/pending` - Pending posts
- `POST /admin/posts/:id/moderate` - Moderate post
- `GET /admin/reports` - User reports

## 🎨 Frontend Components

### Core Components
- **Layout**: Navbar, Footer, Sidebar
- **Posts**: PostCard, PostDetail, CreatePost
- **Comments**: CommentList, CommentForm
- **Users**: Profile, UserCard
- **Forms**: Login, Register, Search

### UI Components
- **Common**: LoadingSpinner, ErrorBoundary
- **Navigation**: Breadcrumbs, Pagination
- **Interactive**: LikeButton, BookmarkButton
- **Modals**: ConfirmDialog, ImageUpload

## 🚀 Deployment

### Free Hosting Options

#### 1. Render (Recommended)
- **Pros**: Free tier, automatic deployments, PostgreSQL hosting
- **Setup**: Connect GitHub repo, auto-deploy on push
- **Database**: Free PostgreSQL instance included

#### 2. Railway
- **Pros**: Free tier, easy PostgreSQL setup, good performance
- **Setup**: GitHub integration, environment variables

#### 3. Heroku
- **Pros**: Free tier (limited), good documentation
- **Setup**: Git-based deployment, add-on PostgreSQL

### Domain & SSL Setup

#### 1. Domain Registration
- **Freenom**: Free domains (.tk, .ml, .ga, .cf)
- **Namecheap**: Affordable domains with good support
- **GoDaddy**: Popular choice, competitive pricing

#### 2. SSL Certificate
- **Let's Encrypt**: Free SSL certificates
- **Cloudflare**: Free SSL + CDN
- **Hosting Provider**: Many include free SSL

### Deployment Steps

#### 1. Prepare for Production
```bash
# Build frontend
npm run build

# Set production environment
NODE_ENV=production
```

#### 2. Database Migration
```bash
# Run migrations on production database
npm run db:migrate
```

#### 3. Environment Variables
Set production environment variables:
- Database connection (production)
- JWT secret (strong, unique)
- File upload paths
- Rate limiting (production values)

#### 4. Deploy Backend
```bash
# Start production server
npm start
```

#### 5. Configure Domain
- Point domain to hosting provider
- Set up SSL certificate
- Configure reverse proxy if needed

## 🔧 Configuration

### Production Settings
```env
NODE_ENV=production
PORT=5000
DB_HOST=your_production_db_host
DB_PASSWORD=your_production_db_password
JWT_SECRET=your_production_jwt_secret
UPLOAD_PATH=/app/uploads
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
```

### File Uploads
```env
MAX_FILE_SIZE=5242880          # 5MB
UPLOAD_PATH=./uploads          # Local path
```

## 📊 Performance Optimization

### Database
- Indexed queries for fast search
- Connection pooling
- Query optimization

### Frontend
- Code splitting with React.lazy
- Image optimization
- Caching strategies

### Backend
- Response compression
- Static file serving
- Memory management

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test

# Run all tests
npm run test:all
```

## 📈 Monitoring & Analytics

- **Search Analytics**: Track popular searches
- **User Engagement**: Post views, likes, comments
- **Performance Metrics**: Response times, error rates
- **Content Moderation**: Report tracking

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **Input Validation**: Validate all user inputs
3. **SQL Injection**: Use parameterized queries
4. **XSS Prevention**: Sanitize user content
5. **Rate Limiting**: Prevent abuse
6. **HTTPS**: Always use SSL in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: Check the docs folder
- **Community**: Join our discussions

## 🚀 Future Enhancements

- **Email Notifications**: User engagement
- **Advanced Analytics**: Detailed insights
- **Mobile App**: React Native version
- **API Rate Limiting**: Tiered access
- **Content Scheduling**: Future post publishing
- **Multi-language Support**: Internationalization

## 📁 Project Structure

```
blog/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.js         # Main app component
│   ├── package.json       # Frontend dependencies
│   └── tailwind.config.js # Tailwind configuration
├── server/                # Node.js backend
│   ├── database/          # Database files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── package.json       # Backend dependencies
├── uploads/               # File uploads
├── package.json           # Root package.json
├── README.md              # This file
└── DEPLOYMENT.md          # Deployment guide
```

## 🎯 Getting Started Checklist

- [ ] Install Node.js and PostgreSQL
- [ ] Clone the repository
- [ ] Install dependencies (`npm run install:all`)
- [ ] Set up environment variables
- [ ] Create and configure database
- [ ] Run migrations (`npm run db:migrate`)
- [ ] Seed initial data (`npm run db:seed`)
- [ ] Start development servers (`npm run dev`)
- [ ] Access the application at `http://localhost:3000`

---

Built with ❤️ for the developer community
