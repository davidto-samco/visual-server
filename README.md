# Visual Order Lookup API

**Version:** 1.1.0
**Last Updated:** 2026-02-19

A backend REST API server for managing and querying manufacturing/engineering order data. Built to provide lookup capabilities for work orders, operations, requirements, and parts inventory.

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **Database:** Microsoft SQL Server (mssql v12)
- **Logging:** Winston 3.x
- **Security:** Helmet 8.x, CORS
- **Testing:** Jest 30.x, Supertest

## Features

- Work order search and lookup with hierarchical tree views
- Operations and requirements management
- Parts inventory search and where-used tracking
- Sales order search, filtering, and acknowledgement display
- WIP (work-in-progress) cost balance queries
- Health monitoring with database connectivity checks
- Structured logging and centralized error handling

## Project Structure

```
src/
├── index.js                    # Entry point
├── app.js                      # Express app setup & middleware
├── config/
│   └── database.js             # SQL Server connection config
├── database/
│   └── connection.js           # Database pool management
├── routes/
│   ├── index.js                # Main router
│   ├── engineering.routes.js   # Work order routes
│   ├── inventory.routes.js     # Parts/inventory routes
│   └── sales.routes.js         # Sales order routes
├── controllers/
│   ├── healthController.js     # Health check endpoints
│   ├── engineering/
│   │   └── workOrderController.js
│   ├── inventory/
│   │   └── partController.js
│   └── sales/
│       └── orderController.js
├── services/
│   ├── engineering/
│   │   ├── workOrderService.js
│   │   └── workOrderTreeService.js
│   ├── inventory/
│   │   └── partService.js
│   └── sales/
│       └── orderService.js
├── repositories/
│   ├── engineering/
│   │   ├── workOrderRepository.js
│   │   └── workOrderTreeRepository.js
│   ├── inventory/
│   │   └── partRepository.js
│   └── sales/
│       └── orderRepository.js
├── models/
│   ├── engineering/
│   │   ├── WorkOrder.js
│   │   ├── Operation.js
│   │   └── Requirement.js
│   ├── inventory/
│   │   └── WhereUsed.js
│   └── sales/
│       └── Order.js
├── middleware/
│   ├── errorHandler.js
│   ├── notFound.js
│   └── requestLogger.js
└── utils/
    ├── errors.js               # Custom error classes
    ├── validation.js
    ├── logger.js
    └── formatters.js
```

## API Routes

### Health Check

| Method | Endpoint     | Description                                  |
| ------ | ------------ | -------------------------------------------- |
| GET    | `/health`    | Server health status and uptime              |
| GET    | `/health/db` | Database connection status and response time |

### Engineering - Work Orders

Base path: `/api/engineering/work-orders`

| Method | Endpoint                                                    | Description                                         |
| ------ | ----------------------------------------------------------- | --------------------------------------------------- |
| GET    | `/search?baseId=<pattern>&page=<n>&limit=<n>`               | Search work orders by BASE_ID pattern               |
| GET    | `/:baseId/:lotId/:subId`                                    | Get work order header details with aggregate counts |
| GET    | `/:baseId/:lotId/:subId/operations`                         | Get all operations for a work order                 |
| GET    | `/:baseId/:lotId/:subId/operations/:sequence/requirements`  | Get requirements for a specific operation           |
| GET    | `/:baseId/:lotId/:subId/sub-work-orders`                    | Get all sub-work orders                             |
| GET    | `/:baseId/:lotId/:subId/wip-balance`                        | Get work-in-progress cost balance                   |
| GET    | `/:baseId/:lotId/tree/simplified`                           | Get simplified hierarchical tree structure          |
| GET    | `/:baseId/:lotId/tree/detailed`                             | Get detailed hierarchical tree with node types      |

**Note:** Use `-` for empty `subId` values in path parameters.

### Inventory - Parts

Base path: `/api/inventory/parts`

| Method | Endpoint                             | Description                             |
| ------ | ------------------------------------ | --------------------------------------- |
| GET    | `/search?partNumber=<pattern>`       | Search parts by part number             |
| GET    | `/:partId`                           | Get detailed part information           |
| GET    | `/:partId/where-used?page=&limit=`   | Get work orders where this part is used |
| GET    | `/:partId/extended-description`      | Get extended description for a part     |

### Sales - Orders

Base path: `/api/sales/orders`

| Method | Endpoint                                        | Description                                      |
| ------ | ----------------------------------------------- | ------------------------------------------------ |
| GET    | `/?customerName=&startDate=&endDate=&page=&limit=` | Search/filter orders or get recent orders     |
| GET    | `/:jobNumber`                                   | Get order acknowledgement with customer details  |
| GET    | `/:jobNumber/line-items?page=&limit=`           | Get paginated line items for an order            |
| GET    | `/:jobNumber/line-items/:lineNumber/extended-description` | Get extended description for a line item |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descriptive error message"
  }
}
```

**Error Codes:**

| Code             | Status | Description              |
| ---------------- | ------ | ------------------------ |
| VALIDATION_ERROR | 400    | Invalid input            |
| NOT_FOUND        | 404    | Resource not found       |
| TIMEOUT          | 408    | Request timeout          |
| INTERNAL_ERROR   | 500    | Unexpected server error  |
| DATABASE_ERROR   | 503    | Database operation failed|

## Setup

### Prerequisites

- Node.js 18+
- Microsoft SQL Server

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
DB_SERVER=<server-name>
DB_DATABASE=<db-name>
DB_USER=<username>
DB_PASSWORD=<password>
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_CONNECTION_TIMEOUT=30000
DB_REQUEST_TIMEOUT=30000
DB_POOL_MIN=2
DB_POOL_MAX=10

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Test database connection
npm run db:test
```

## Scripts

| Script                  | Description                           |
| ----------------------- | ------------------------------------- |
| `npm start`             | Start production server               |
| `npm run dev`           | Start development server with nodemon |
| `npm test`              | Run tests with Jest                   |
| `npm run test:watch`    | Run tests in watch mode               |
| `npm run test:coverage` | Run tests with coverage report        |
| `npm run lint`          | Run ESLint                            |
| `npm run lint:fix`      | Run ESLint with auto-fix              |
| `npm run db:test`       | Test database connection              |

## Architecture

The API follows a layered architecture:

1. **Controllers** - HTTP request/response handling
2. **Services** - Business logic and validation
3. **Repositories** - Database operations (Data Access Layer)
4. **Models** - Data transformation and formatting
5. **Middleware** - Request processing pipeline

## Database Tables

The API queries the following main tables:

| Table              | Description                        |
| ------------------ | ---------------------------------- |
| `WORK_ORDER`       | Manufacturing work orders          |
| `OPERATION`        | Operations within work orders      |
| `REQUIREMENT`      | Materials required for operations  |
| `PART`             | Parts/inventory master data        |
| `PART_BINARY`      | Extended part descriptions         |
| `WIP_BALANCE`      | Work-in-progress cost tracking     |
| `LABOR_TICKET`     | Labor tracking                     |
| `INVENTORY_TRANS`  | Inventory transactions             |
| `CUSTOMER_ORDER`   | Sales/customer orders              |
| `CUST_ORDER_LINE`  | Sales order line items             |
| `CUST_LINE_BINARY` | Extended line item descriptions    |
| `CUSTOMER`         | Customer master data               |
| `SALES_REP`        | Sales representative data          |

## License

Proprietary - Samco Machinery
