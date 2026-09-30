const fs = require('fs');
const path = require('path');

const postmanCollection = {
  "info": {
    "_postman_id": "insurance-policy-management-api-v1",
    "name": "Insurance Policy Management System API",
    "description": "Production-grade Postman collection for the Insurance Policy Management Backend API covering CSV/XLSX Bulk Ingestion, Policy Listing, Policy Search, User Summary Aggregation, Categories, Carriers, Scheduled Messaging, Health Checks, and API Documentation. All GET endpoints support pagination (page, limit), full dataset bypass (all=true), date range filtering (startDate, endDate), and keyword search (search/q).",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "System & Operational",
      "item": [
        {
          "name": "Root API Information",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/",
              "host": ["{{baseUrl}}"],
              "path": [""]
            },
            "description": "Retrieves API name, version, documentation link, and health check route."
          },
          "response": [
            {
              "name": "200 OK - Root Metadata",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                name: "Insurance Policy Management System API",
                version: "1.0.0",
                docs: "/api-docs",
                health: "/health"
              }, null, 2)
            }
          ]
        },
        {
          "name": "Health Check & DB Status",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/health",
              "host": ["{{baseUrl}}"],
              "path": ["health"]
            },
            "description": "Checks server health, uptime, MongoDB readyState connectivity, and memory usage."
          },
          "response": [
            {
              "name": "200 OK - System Healthy",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                status: "UP",
                timestamp: "2026-09-30T16:50:00.000Z",
                uptime: 320.15,
                database: "UP",
                memoryUsage: {
                  rss: 102780928,
                  heapTotal: 25464832,
                  heapUsed: 23846856,
                  external: 21052202
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "Swagger UI Documentation",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api-docs/",
              "host": ["{{baseUrl}}"],
              "path": ["api-docs", ""]
            },
            "description": "Returns interactive Swagger UI documentation HTML."
          },
          "response": [
            {
              "name": "200 OK - Swagger HTML",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "html",
              "body": "<!DOCTYPE html>\n<html>\n<head>\n  <title>Swagger UI</title>\n</head>\n<body>\n  <div id=\"swagger-ui\"></div>\n</body>\n</html>"
            }
          ]
        }
      ]
    },
    {
      "name": "Policies",
      "item": [
        {
          "name": "Bulk Import Policies (CSV / Excel)",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": "data-sheet.csv",
                  "description": "CSV or XLSX spreadsheet to import into MongoDB via dedicated Worker Thread"
                }
              ]
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies/import",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies", "import"]
            },
            "description": "Uploads and offloads high-volume CSV or Excel (.xlsx, .xls) parsing, data normalization, deduplication, and bulk database operations to isolated Node.js Worker Threads."
          },
          "response": [
            {
              "name": "200 OK - Import Success",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                summary: {
                  totalRows: 1198,
                  processed: 1198,
                  inserted: 1198,
                  updated: 0,
                  skipped: 0,
                  failed: 0,
                  insertedCounts: {
                    agents: 3,
                    users: 1149,
                    accounts: 1193,
                    categories: 22,
                    carriers: 49,
                    policies: 1198
                  }
                },
                entities: {
                  agents: 3,
                  users: 1149,
                  accounts: 1193,
                  categories: 22,
                  carriers: 49,
                  policies: 1198
                },
                validationErrors: []
              }, null, 2)
            }
          ]
        },
        {
          "name": "List All Policies (Pagination, all=true, Dates, Search)",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies?page=1&limit=10&all=false&startDate=2018-01-01&endDate=2019-12-31&search=Commercial",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies"],
              "query": [
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to bypass pagination and return all matching policies"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Number of records per page"
                },
                {
                  "key": "startDate",
                  "value": "2018-01-01",
                  "description": "Filter policies starting on or after this date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2019-12-31",
                  "description": "Filter policies starting on or before this date (YYYY-MM-DD)"
                },
                {
                  "key": "search",
                  "value": "Commercial",
                  "description": "Search keyword matching policyNumber, policyType, policyMode, producer, csr"
                }
              ]
            },
            "description": "Retrieves policies with populated user, account, carrier, category, and agent references. Supports pagination ('page', 'limit'), 'all=true' to return all records without pagination, date range filtering ('startDate', 'endDate'), and keyword search ('search')."
          },
          "response": [
            {
              "name": "200 OK - Paginated Policies",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                count: 10,
                data: [
                  {
                    id: "6abd41d4e071afde8b5c8145",
                    policyNumber: "YEEX9MOIBU7X",
                    policyStartDate: "2018-11-02",
                    policyEndDate: "2019-11-02",
                    policyType: "Single",
                    policyMode: "12",
                    premiumAmount: 1180.83,
                    producer: "Brandie Placencia",
                    csr: "Tami Ellison",
                    account: { id: "6abd41d4e071afde8b5c8146", name: "Lura Lucca & Owen Dodson", type: "Commercial" },
                    carrier: { id: "6abd41d4e071afde8b5c8147", name: "Integon Gen Ins Corp" },
                    category: { id: "6abd41d4e071afde8b5c8148", name: "Commercial Auto" },
                    agent: { id: "6abd41d4e071afde8b5c8149", name: "Alex Watson" }
                  }
                ],
                pagination: {
                  total: 1198,
                  page: 1,
                  limit: 10,
                  totalPages: 120,
                  hasPrevPage: false,
                  hasNextPage: true,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "Search Policies by User (Email or First Name)",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies/search?username=madler@yahoo.ca&page=1&limit=10&all=false&startDate=2018-01-01&endDate=2019-12-31&search=YEEX",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies", "search"],
              "query": [
                {
                  "key": "username",
                  "value": "madler@yahoo.ca",
                  "description": "User email address (exact match) or first name (case-insensitive)"
                },
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to bypass pagination"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Items per page"
                },
                {
                  "key": "startDate",
                  "value": "2018-01-01",
                  "description": "Filter user policies starting on or after date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2019-12-31",
                  "description": "Filter user policies starting on or before date (YYYY-MM-DD)"
                },
                {
                  "key": "search",
                  "value": "YEEX",
                  "description": "Search keyword across user policies"
                }
              ]
            },
            "description": "Searches for an insured client by email or first name and returns their profile and associated policies enriched with account, carrier, category, and agent details. Supports pagination, all=true, date range, and search keyword."
          },
          "response": [
            {
              "name": "200 OK - Search by Email",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                user: {
                  id: "60d0fe4f5311236168a109ca",
                  firstName: "Lura Lucca",
                  email: "madler@yahoo.ca",
                  phone: "8677356559",
                  city: "MOCKSVILLE",
                  state: "NC",
                  zipCode: "27028",
                  userType: "Active Client"
                },
                policies: [
                  {
                    id: "60d0fe4f5311236168a109cb",
                    policyNumber: "YEEX9MOIBU7X",
                    policyStartDate: "2018-11-02",
                    policyEndDate: "2019-11-02",
                    policyType: "Single",
                    policyMode: "12",
                    premiumAmount: 1180.83,
                    producer: "Brandie Placencia",
                    csr: "Tami Ellison",
                    account: { id: "60d0fe4f5311236168a109cc", name: "Lura Lucca & Owen Dodson", type: "Commercial" },
                    carrier: { id: "60d0fe4f5311236168a109cd", name: "Integon Gen Ins Corp" },
                    category: { id: "60d0fe4f5311236168a109ce", name: "Commercial Auto" },
                    agent: { id: "60d0fe4f5311236168a109cf", name: "Alex Watson" }
                  }
                ],
                pagination: {
                  total: 1,
                  page: 1,
                  limit: 10,
                  totalPages: 1,
                  hasPrevPage: false,
                  hasNextPage: false,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "Aggregated Policy Summary Grouped by User",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies/summary?page=1&limit=10&all=false&startDate=2018-01-01&endDate=2019-12-31&search=Cynthia",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies", "summary"],
              "query": [
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to bypass pagination and return all user summaries"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Page size / record limit"
                },
                {
                  "key": "startDate",
                  "value": "2018-01-01",
                  "description": "Filter summaries where policies started on or after date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2019-12-31",
                  "description": "Filter summaries where policies started on or before date (YYYY-MM-DD)"
                },
                {
                  "key": "search",
                  "value": "Cynthia",
                  "description": "Search keyword matching user name or email"
                }
              ]
            },
            "description": "Executes a MongoDB aggregation pipeline that groups policies by user and computes total policy count, distinct policy categories, distinct carriers, date spans, and rounded total premium. Supports pagination, all=true, date range, and keyword search."
          },
          "response": [
            {
              "name": "200 OK - Grouped Summary",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                data: [
                  {
                    userId: "60d0fe4f5311236168a109ca",
                    firstName: "Cynthia Peters",
                    email: "eidac@hotmail.com",
                    totalPolicies: 3,
                    categories: ["Homeowners", "Commercial Package", "Dwelling Fire"],
                    carriers: ["Nationwide Mut Ins Co", "Nationwide Mut Fire Ins Co_Copy"],
                    firstPolicyStartDate: "2018-03-21",
                    lastPolicyEndDate: "2020-01-09",
                    totalPremium: 11111.07
                  }
                ],
                pagination: {
                  total: 1,
                  page: 1,
                  limit: 10,
                  totalPages: 1,
                  hasPrevPage: false,
                  hasNextPage: false,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "List All Policy Categories",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies/categories?page=1&limit=10&all=false&search=Auto",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies", "categories"],
              "query": [
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to return all categories without pagination"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Number of records per page"
                },
                {
                  "key": "startDate",
                  "value": "2026-01-01",
                  "description": "Filter categories created on or after date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2026-12-31",
                  "description": "Filter categories created on or before date (YYYY-MM-DD)"
                },
                {
                  "key": "search",
                  "value": "Auto",
                  "description": "Search keyword matching categoryName"
                }
              ]
            },
            "description": "Retrieves all distinct policy categories (e.g. Commercial Auto, Homeowners, Personal Auto) stored in the policycategories collection. Supports pagination, all=true, date range, and keyword search."
          },
          "response": [
            {
              "name": "200 OK - Categories List",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                count: 1,
                categories: [
                  {
                    _id: "6abd41eb82b24c72a4f6f2b7",
                    categoryName: "Commercial Auto",
                    createdAt: "2026-09-30T17:07:55.310Z",
                    updatedAt: "2026-09-30T17:07:55.310Z"
                  }
                ],
                data: [
                  {
                    _id: "6abd41eb82b24c72a4f6f2b7",
                    categoryName: "Commercial Auto",
                    createdAt: "2026-09-30T17:07:55.310Z",
                    updatedAt: "2026-09-30T17:07:55.310Z"
                  }
                ],
                pagination: {
                  total: 22,
                  page: 1,
                  limit: 10,
                  totalPages: 3,
                  hasPrevPage: false,
                  hasNextPage: true,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "List All Policy Carriers",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/policies/carriers?page=1&limit=10&all=false&search=Integon",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "policies", "carriers"],
              "query": [
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to return all carriers without pagination"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Number of records per page"
                },
                {
                  "key": "startDate",
                  "value": "2026-01-01",
                  "description": "Filter carriers created on or after date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2026-12-31",
                  "description": "Filter carriers created on or before date (YYYY-MM-DD)"
                },
                {
                  "key": "search",
                  "value": "Integon",
                  "description": "Search keyword matching companyName"
                }
              ]
            },
            "description": "Retrieves all distinct policy carriers/insurance companies stored in the policycarriers collection. Supports pagination, all=true, date range, and keyword search."
          },
          "response": [
            {
              "name": "200 OK - Carriers List",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                count: 1,
                carriers: [
                  {
                    _id: "6abd41d4e071afde8b5c8404",
                    companyName: "Integon Gen Ins Corp",
                    createdAt: "2026-09-30T17:07:33.081Z",
                    updatedAt: "2026-09-30T17:07:33.081Z"
                  }
                ],
                data: [
                  {
                    _id: "6abd41d4e071afde8b5c8404",
                    companyName: "Integon Gen Ins Corp",
                    createdAt: "2026-09-30T17:07:33.081Z",
                    updatedAt: "2026-09-30T17:07:33.081Z"
                  }
                ],
                pagination: {
                  total: 49,
                  page: 1,
                  limit: 10,
                  totalPages: 5,
                  hasPrevPage: false,
                  hasNextPage: true,
                  all: false
                }
              }, null, 2)
            }
          ]
        }
      ]
    },
    {
      "name": "Scheduled Messages",
      "item": [
        {
          "name": "List Scheduled Messages (Pagination, all=true, Dates, Search)",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/v1/messages?page=1&limit=10&all=false&startDate=2026-10-01&endDate=2026-10-31&search=renewal",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "messages"],
              "query": [
                {
                  "key": "all",
                  "value": "false",
                  "description": "Set to true to return all messages without pagination"
                },
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number (1-indexed)"
                },
                {
                  "key": "limit",
                  "value": "10",
                  "description": "Number of records per page"
                },
                {
                  "key": "startDate",
                  "value": "2026-10-01",
                  "description": "Filter messages scheduled on or after date (YYYY-MM-DD)"
                },
                {
                  "key": "endDate",
                  "value": "2026-10-31",
                  "description": "Filter messages scheduled on or before date (YYYY-MM-DD)"
                },
                {
                  "key": "status",
                  "value": "PENDING",
                  "description": "Filter by message status (PENDING, PROCESSING, COMPLETED, FAILED)"
                },
                {
                  "key": "search",
                  "value": "renewal",
                  "description": "Search keyword matching message text or status"
                }
              ]
            },
            "description": "Retrieves scheduled messages with support for pagination, all=true, date range filtering on scheduledAt, status filtering, and keyword search."
          },
          "response": [
            {
              "name": "200 OK - Messages List",
              "status": "OK",
              "code": 200,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                count: 1,
                messages: [
                  {
                    id: "6abd3f02d5a74511085b5fec",
                    message: "Policy renewal reminder for next month",
                    scheduledAt: "2026-10-05T09:00:00.000Z",
                    status: "PENDING",
                    createdAt: "2026-09-30T16:55:30.406Z"
                  }
                ],
                data: [
                  {
                    id: "6abd3f02d5a74511085b5fec",
                    message: "Policy renewal reminder for next month",
                    scheduledAt: "2026-10-05T09:00:00.000Z",
                    status: "PENDING",
                    createdAt: "2026-09-30T16:55:30.406Z"
                  }
                ],
                pagination: {
                  total: 1,
                  page: 1,
                  limit: 10,
                  totalPages: 1,
                  hasPrevPage: false,
                  hasNextPage: false,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          "name": "Schedule a Message (Day & Time)",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"message\": \"Policy renewal reminder for next month\",\n  \"day\": \"2026-10-05\",\n  \"time\": \"14:30\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/messages",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "messages"]
            },
            "description": "Schedules a message with a specific message text, day (YYYY-MM-DD), and time (HH:mm). Stored in the scheduledmessages collection and claimed by the background worker."
          },
          "response": [
            {
              "name": "201 Created - Message Scheduled",
              "status": "Created",
              "code": 201,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: true,
                message: "Message scheduled successfully",
                data: {
                  id: "6abd3f02d5a74511085b5fec",
                  message: "Policy renewal reminder for next month",
                  scheduledAt: "2026-10-05T09:00:00.000Z",
                  status: "PENDING",
                  createdAt: "2026-09-30T16:55:30.406Z"
                }
              }, null, 2)
            },
            {
              "name": "422 Unprocessable Entity - Validation Error",
              "status": "Unprocessable Entity",
              "code": 422,
              "_postman_previewlanguage": "json",
              "body": JSON.stringify({
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Validation error in message payload",
                  details: ["Field \"day\" is required and must match format YYYY-MM-DD"]
                }
              }, null, 2)
            }
          ]
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    }
  ]
};

fs.writeFileSync(
  path.join(__dirname, '..', 'docs', 'Insurance_Policy_Management.postman_collection.json'),
  JSON.stringify(postmanCollection, null, 2),
  'utf8'
);

console.log('Postman collection successfully generated and formatted!');
