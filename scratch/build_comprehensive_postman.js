const fs = require('fs');
const path = require('path');

function createQueryParam(key, value, description, disabled = false) {
  return { key, value, description, disabled };
}

const collection = {
  info: {
    _postman_id: "insurance-policy-management-api-v1",
    name: "Insurance Policy Management System API",
    description: "Complete, exhaustive Postman collection for the Insurance Policy Management Backend API.\n\n### Core Capabilities:\n- **Bulk CSV / XLSX Data Ingestion** via isolated worker threads with deduplication across Agents, Users, Accounts, Categories, Carriers, and Policies.\n- **Universal Pagination**: `page` (1-indexed) & `limit` query parameters with structured metadata (`total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`, `all`).\n- **Full Dataset Extraction (`all=true`)**: Bypasses pagination to return all records with `{ total, all: true }`.\n- **Date Range Filtering**: `startDate` & `endDate` (`YYYY-MM-DD`, `MM/DD/YYYY`, ISO).\n- **Keyword Search**: `search` or `q` case-insensitive regex search.\n- **User Summary Aggregation Pipeline**: Grouping policies by user with financial and category analytics.\n- **Category & Carrier Directory Services**.\n- **Real-Time Scheduled Messages with Socket.IO**: Real-time WebSocket scheduling, streaming execution, and auto-sync.\n- **System Health & CPU Monitoring**.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    {
      key: "baseUrl",
      value: "http://localhost:3000",
      type: "string"
    }
  ],
  item: [
    {
      name: "1. System & Operations",
      item: [
        {
          name: "Root API Metadata",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/",
              host: ["{{baseUrl}}"],
              path: [""]
            },
            description: "Returns service metadata, version, and links to documentation, health check, and real-time dashboard."
          },
          response: [
            {
              name: "200 OK - Metadata",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                name: "Insurance Policy Management System API",
                version: "1.0.0",
                docs: "/api-docs",
                health: "/health",
                realtime: "/realtime"
              }, null, 2)
            }
          ]
        },
        {
          name: "Health Check & Database Status",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/health",
              host: ["{{baseUrl}}"],
              path: ["health"]
            },
            description: "Monitors server health, uptime, MongoDB readyState connectivity, and memory allocation."
          },
          response: [
            {
              name: "200 OK - Healthy",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                status: "UP",
                timestamp: "2026-09-30T18:00:00.000Z",
                uptime: 350.2,
                database: "UP",
                memoryUsage: {
                  rss: 98500000,
                  heapTotal: 34000000,
                  heapUsed: 26000000,
                  external: 18000000
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "Swagger UI OpenAPI Spec",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api-docs/",
              host: ["{{baseUrl}}"],
              path: ["api-docs", ""]
            },
            description: "Interactive Swagger OpenAPI 3.0 documentation HTML."
          },
          response: []
        },
        {
          name: "Real-Time Socket.IO Dashboard HTML",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/realtime",
              host: ["{{baseUrl}}"],
              path: ["realtime"]
            },
            description: "Interactive real-time web dashboard powered by Socket.IO for live scheduled message streaming, scheduling, and execution tracking."
          },
          response: []
        },
        {
          name: "Socket.IO Protocol Handshake (HTTP Polling)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/socket.io/?EIO=4&transport=polling",
              host: ["{{baseUrl}}"],
              path: ["socket.io", ""],
              query: [
                { key: "EIO", value: "4", description: "Engine.IO Protocol Version" },
                { key: "transport", value: "polling", description: "Transport Protocol" }
              ]
            },
            description: "Initial HTTP handshake performed by Socket.IO clients before upgrading to WebSocket protocol."
          },
          response: []
        }
      ]
    },
    {
      name: "2. Bulk Data Ingestion",
      item: [
        {
          name: "Upload CSV/Excel Policies via Worker Threads",
          request: {
            method: "POST",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                {
                  key: "file",
                  type: "file",
                  src: "data-sheet.csv",
                  description: "Upload CSV or XLSX spreadsheet for background worker parsing and batch ingestion"
                }
              ]
            },
            url: {
              raw: "{{baseUrl}}/api/v1/policies/import",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "import"]
            },
            description: "Offloads file parsing, data normalization, deduplication across 6 master entities (Agents, Users, Accounts, Categories, Carriers, Policies), and auto-generates policy renewal reminders into 'scheduledmessages' using an isolated Node.js Worker Thread."
          },
          response: [
            {
              name: "200 OK - Import Success",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
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
                    policies: 1198,
                    scheduledMessages: 1198
                  }
                },
                entities: {
                  agents: 3,
                  users: 1149,
                  accounts: 1193,
                  categories: 22,
                  carriers: 49,
                  policies: 1198,
                  scheduledMessages: 1198
                },
                validationErrors: []
              }, null, 2)
            }
          ]
        },
        {
          name: "Import Error: Missing File Attachment",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/import",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "import"]
            },
            description: "Demonstrates 400 Bad Request error response when the 'file' multipart field is omitted."
          },
          response: [
            {
              name: "400 Bad Request - Missing File",
              status: "Bad Request",
              code: 400,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "BAD_REQUEST",
                  message: "Please attach a CSV or XLSX file with field name \"file\"",
                  details: []
                }
              }, null, 2)
            }
          ]
        }
      ]
    },
    {
      name: "3. Policies Management",
      item: [
        {
          name: "List All Policies - Paginated (Default)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies"],
              query: [
                createQueryParam("page", "1", "Page number (1-indexed)"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to return all records without pagination", true),
                createQueryParam("startDate", "2018-01-01", "Filter policies starting on/after date", true),
                createQueryParam("endDate", "2019-12-31", "Filter policies starting on/before date", true),
                createQueryParam("search", "Commercial", "Keyword search across policy fields", true)
              ]
            },
            description: "Retrieves policies with populated user, account, carrier, category, and agent details using standard pagination."
          },
          response: []
        },
        {
          name: "List All Policies - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies?all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies"],
              query: [
                createQueryParam("all", "true", "Bypasses pagination and returns all records"),
                createQueryParam("startDate", "2018-01-01", "Filter policies starting on/after date", true),
                createQueryParam("endDate", "2019-12-31", "Filter policies starting on/before date", true),
                createQueryParam("search", "Single", "Keyword search across policy fields", true)
              ]
            },
            description: "Bypasses pagination via `all=true` and returns the entire set of matching policies without limits."
          },
          response: []
        },
        {
          name: "List All Policies - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies?startDate=2018-01-01&endDate=2018-06-30&page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies"],
              query: [
                createQueryParam("startDate", "2018-01-01", "Start date (YYYY-MM-DD)"),
                createQueryParam("endDate", "2018-06-30", "End date (YYYY-MM-DD)"),
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Number of records per page"),
                createQueryParam("all", "false", "Set to true to fetch all within date range", true)
              ]
            },
            description: "Filters policies where `policyStartDate` falls between `startDate` and `endDate`."
          },
          response: []
        },
        {
          name: "List All Policies - Search by Keyword",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies?search=Single&page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies"],
              query: [
                createQueryParam("search", "Single", "Keyword matching policyNumber, policyType, policyMode, producer, csr"),
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to return all search results", true)
              ]
            },
            description: "Performs case-insensitive regex search across policy number, type, mode, producer, and csr."
          },
          response: []
        },
        {
          name: "List All Policies - Combined (Dates + Search + all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies?startDate=2018-01-01&endDate=2018-12-31&search=Single&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies"],
              query: [
                createQueryParam("startDate", "2018-01-01", "Start date (YYYY-MM-DD)"),
                createQueryParam("endDate", "2018-12-31", "End date (YYYY-MM-DD)"),
                createQueryParam("search", "Single", "Search keyword"),
                createQueryParam("all", "true", "Return all matching records without pagination")
              ]
            },
            description: "Combines date range filter, keyword search, and pagination bypass in a single request."
          },
          response: []
        }
      ]
    },
    {
      name: "4. Search Policies by User",
      item: [
        {
          name: "Search by User - Exact Email",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=madler@yahoo.ca",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "madler@yahoo.ca", "User email address"),
                createQueryParam("all", "false", "Set to true to return all user policies", true),
                createQueryParam("page", "1", "Page number", true),
                createQueryParam("limit", "10", "Records per page", true),
                createQueryParam("startDate", "2018-01-01", "Filter user policies starting on/after date", true),
                createQueryParam("endDate", "2019-12-31", "Filter user policies starting on/before date", true),
                createQueryParam("search", "Commercial", "Search within user policies", true)
              ]
            },
            description: "Finds user by exact email and returns their profile plus all associated enriched policies."
          },
          response: [
            {
              name: "200 OK - Search by Email",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
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
          name: "Search by User - First Name Regex",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=Lura",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "Lura", "User first name (case-insensitive regex)"),
                createQueryParam("all", "false", "Set to true to bypass pagination", true),
                createQueryParam("page", "1", "Page number", true),
                createQueryParam("limit", "10", "Records per page", true)
              ]
            },
            description: "Finds user by first name using case-insensitive regex search and returns their policies."
          },
          response: []
        },
        {
          name: "Search by User - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=madler@yahoo.ca&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "madler@yahoo.ca", "User email address"),
                createQueryParam("all", "true", "Fetch all policies for user without pagination")
              ]
            },
            description: "Returns all policies belonging to the user without pagination."
          },
          response: []
        },
        {
          name: "Search by User - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=madler@yahoo.ca&startDate=2018-01-01&endDate=2019-12-31",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "madler@yahoo.ca", "User email"),
                createQueryParam("startDate", "2018-01-01", "Start date (YYYY-MM-DD)"),
                createQueryParam("endDate", "2019-12-31", "End date (YYYY-MM-DD)"),
                createQueryParam("all", "true", "Return all policies in date range", true)
              ]
            },
            description: "Returns user policies filtered between specified dates."
          },
          response: []
        },
        {
          name: "Search by User - Search Policy Keyword",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=madler@yahoo.ca&search=YEEX",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "madler@yahoo.ca", "User email"),
                createQueryParam("search", "YEEX", "Keyword search across user policies"),
                createQueryParam("all", "true", "Return all matching policies", true)
              ]
            },
            description: "Filters user policies by keyword matching policy fields."
          },
          response: []
        },
        {
          name: "Search by User - Error: Missing Username",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"]
            },
            description: "Demonstrates 400 Bad Request error when the required 'username' query parameter is missing."
          },
          response: [
            {
              name: "400 Bad Request - Missing Parameter",
              status: "Bad Request",
              code: 400,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Validation error in query parameters",
                  details: ["Query parameter \"username\" is required and cannot be empty"]
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "Search by User - Error: User Not Found",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/search?username=nonexistent@example.com",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "search"],
              query: [
                createQueryParam("username", "nonexistent@example.com", "Unknown user identifier")
              ]
            },
            description: "Demonstrates 404 Not Found error response when no user matches the query."
          },
          response: [
            {
              name: "404 Not Found - Unknown User",
              status: "Not Found",
              code: 404,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "NOT_FOUND",
                  message: "No user or policies found matching 'nonexistent@example.com'",
                  details: []
                }
              }, null, 2)
            }
          ]
        }
      ]
    },
    {
      name: "5. User Policy Summary Aggregation",
      item: [
        {
          name: "Aggregated Summary - Paginated (Default)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/summary?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "summary"],
              query: [
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Number of user summaries per page"),
                createQueryParam("all", "false", "Set to true to return all user summaries", true),
                createQueryParam("startDate", "2018-01-01", "Filter summaries by policy start date", true),
                createQueryParam("endDate", "2019-12-31", "Filter summaries by policy start date", true),
                createQueryParam("search", "Cynthia", "Search by user name or email", true)
              ]
            },
            description: "MongoDB aggregation pipeline grouping policies by user, computing total policies, unique categories, unique carriers, dates, and total premium."
          },
          response: [
            {
              name: "200 OK - Grouped Summary",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
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
                  total: 1153,
                  page: 1,
                  limit: 10,
                  totalPages: 116,
                  hasPrevPage: false,
                  hasNextPage: true,
                  all: false
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "Aggregated Summary - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/summary?all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "summary"],
              query: [
                createQueryParam("all", "true", "Fetch all user summaries without pagination"),
                createQueryParam("search", "Peters", "Search user within summary", true)
              ]
            },
            description: "Returns aggregated summary for all users in the system without pagination."
          },
          response: []
        },
        {
          name: "Aggregated Summary - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/summary?startDate=2018-01-01&endDate=2018-12-31&page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "summary"],
              query: [
                createQueryParam("startDate", "2018-01-01", "Filter policies started on or after date"),
                createQueryParam("endDate", "2018-12-31", "Filter policies started on or before date"),
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to bypass pagination", true)
              ]
            },
            description: "Aggregates policies within a specific start date window."
          },
          response: []
        },
        {
          name: "Aggregated Summary - Search by User",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/summary?search=Cynthia&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "summary"],
              query: [
                createQueryParam("search", "Cynthia", "Keyword matching user firstName, lastName, or email"),
                createQueryParam("all", "true", "Return all matching user summaries")
              ]
            },
            description: "Filters aggregated summary for users matching the search query."
          },
          response: []
        },
        {
          name: "Aggregated Summary - Error: Invalid Pagination Param",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/summary?page=-1",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "summary"],
              query: [
                createQueryParam("page", "-1", "Invalid negative page number")
              ]
            },
            description: "Demonstrates 400 Bad Request error when pagination parameters are not positive integers."
          },
          response: [
            {
              name: "400 Bad Request - Invalid Parameter",
              status: "Bad Request",
              code: 400,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Validation error in query parameters",
                  details: ["Query parameter \"page\" must be a positive integer"]
                }
              }, null, 2)
            }
          ]
        }
      ]
    },
    {
      name: "6. Policy Categories",
      item: [
        {
          name: "List Categories - Paginated (Default)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/categories?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "categories"],
              query: [
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to return all categories", true),
                createQueryParam("search", "Auto", "Keyword search categoryName", true),
                createQueryParam("startDate", "2026-01-01", "Filter created on or after date", true),
                createQueryParam("endDate", "2026-12-31", "Filter created on or before date", true)
              ]
            },
            description: "Lists distinct policy categories (Lines of Business) with pagination."
          },
          response: []
        },
        {
          name: "List Categories - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/categories?all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "categories"],
              query: [
                createQueryParam("all", "true", "Return all policy categories without pagination")
              ]
            },
            description: "Returns all categories stored in policycategories collection."
          },
          response: [
            {
              name: "200 OK - All Categories",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: true,
                count: 22,
                categories: [
                  {
                    _id: "6abd41eb82b24c72a4f6f2b7",
                    categoryName: "Commercial Auto",
                    createdAt: "2026-09-30T17:07:55.310Z",
                    updatedAt: "2026-09-30T17:07:55.310Z"
                  }
                ],
                pagination: {
                  total: 22,
                  all: true
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "List Categories - Search by Name",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/categories?search=Auto&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "categories"],
              query: [
                createQueryParam("search", "Auto", "Keyword matching categoryName"),
                createQueryParam("all", "true", "Return all matching categories")
              ]
            },
            description: "Searches category names matching the query."
          },
          response: []
        },
        {
          name: "List Categories - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/categories?startDate=2026-01-01&endDate=2026-12-31&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "categories"],
              query: [
                createQueryParam("startDate", "2026-01-01", "Filter created on or after date"),
                createQueryParam("endDate", "2026-12-31", "Filter created on or before date"),
                createQueryParam("all", "true", "Return all categories in date range")
              ]
            },
            description: "Filters categories created within date range."
          },
          response: []
        }
      ]
    },
    {
      name: "7. Policy Carriers",
      item: [
        {
          name: "List Carriers - Paginated (Default)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/carriers?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "carriers"],
              query: [
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to return all carriers", true),
                createQueryParam("search", "Integon", "Keyword search companyName", true),
                createQueryParam("startDate", "2026-01-01", "Filter created on or after date", true),
                createQueryParam("endDate", "2026-12-31", "Filter created on or before date", true)
              ]
            },
            description: "Lists policy carriers (insurance companies) with pagination."
          },
          response: []
        },
        {
          name: "List Carriers - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/carriers?all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "carriers"],
              query: [
                createQueryParam("all", "true", "Return all carriers without pagination")
              ]
            },
            description: "Returns all insurance carriers stored in policycarriers collection."
          },
          response: [
            {
              name: "200 OK - All Carriers",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: true,
                count: 49,
                carriers: [
                  {
                    _id: "6abd41d4e071afde8b5c8404",
                    companyName: "Integon Gen Ins Corp",
                    createdAt: "2026-09-30T17:07:33.081Z",
                    updatedAt: "2026-09-30T17:07:33.081Z"
                  }
                ],
                pagination: {
                  total: 49,
                  all: true
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "List Carriers - Search by Name",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/carriers?search=Integon&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "carriers"],
              query: [
                createQueryParam("search", "Integon", "Keyword matching companyName"),
                createQueryParam("all", "true", "Return all matching carriers")
              ]
            },
            description: "Searches carriers by company name."
          },
          response: []
        },
        {
          name: "List Carriers - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/policies/carriers?startDate=2026-01-01&endDate=2026-12-31&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "policies", "carriers"],
              query: [
                createQueryParam("startDate", "2026-01-01", "Filter created on or after date"),
                createQueryParam("endDate", "2026-12-31", "Filter created on or before date"),
                createQueryParam("all", "true", "Return all carriers in date range")
              ]
            },
            description: "Filters carriers created within date range."
          },
          response: []
        }
      ]
    },
    {
      name: "8. Scheduled Messages & Real-Time Socket.IO",
      item: [
        {
          name: "Schedule a Message (Day & Time)",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                message: "Policy renewal reminder for next month",
                day: "2026-10-15",
                time: "14:30"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/messages",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"]
            },
            description: "Schedules an asynchronous task message for worker execution at the designated day and time, and broadcasts 'message_scheduled' live to all connected Socket.IO clients."
          },
          response: [
            {
              name: "201 Created - Scheduled",
              status: "Created",
              code: 201,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: true,
                message: "Message scheduled successfully",
                data: {
                  id: "6abd3f02d5a74511085b5fec",
                  message: "Policy renewal reminder for next month",
                  scheduledAt: "2026-10-15T09:00:00.000Z",
                  status: "PENDING",
                  createdAt: "2026-09-30T16:55:30.406Z"
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "Schedule Message - Error: Invalid Payload",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                message: "",
                day: "invalid-day",
                time: "99:99"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/api/v1/messages",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"]
            },
            description: "Demonstrates 422 Unprocessable Entity error when day/time format or message text is invalid."
          },
          response: [
            {
              name: "422 Unprocessable Entity - Validation Error",
              status: "Unprocessable Entity",
              code: 422,
              _postman_previewlanguage: "json",
              body: JSON.stringify({
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Validation error in message payload",
                  details: [
                    "Field \"message\" is required and cannot be empty",
                    "Field \"day\" must match format YYYY-MM-DD",
                    "Field \"time\" must match format HH:mm"
                  ]
                }
              }, null, 2)
            }
          ]
        },
        {
          name: "List Messages - Paginated (Default)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("page", "1", "Page number"),
                createQueryParam("limit", "10", "Records per page"),
                createQueryParam("all", "false", "Set to true to return all messages", true),
                createQueryParam("status", "PENDING", "Filter by status: PENDING, PROCESSING, COMPLETED, FAILED", true),
                createQueryParam("startDate", "2026-10-01", "Filter scheduledAt on or after date", true),
                createQueryParam("endDate", "2026-10-31", "Filter scheduledAt on or before date", true),
                createQueryParam("search", "reminder", "Search message text or status", true)
              ]
            },
            description: "Lists scheduled messages with pagination."
          },
          response: []
        },
        {
          name: "List Messages - Full Dataset (all=true)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("all", "true", "Return all scheduled messages without pagination")
              ]
            },
            description: "Returns all scheduled messages without pagination."
          },
          response: []
        },
        {
          name: "List Messages - Between Dates",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?startDate=2026-10-01&endDate=2026-10-31&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("startDate", "2026-10-01", "Scheduled start date (YYYY-MM-DD)"),
                createQueryParam("endDate", "2026-10-31", "Scheduled end date (YYYY-MM-DD)"),
                createQueryParam("all", "true", "Return all messages in date range")
              ]
            },
            description: "Filters messages scheduled between dates."
          },
          response: []
        },
        {
          name: "List Messages - Filter by Status (PENDING)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?status=PENDING&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("status", "PENDING", "Filter status: PENDING, PROCESSING, COMPLETED, FAILED"),
                createQueryParam("all", "true", "Return all matching messages")
              ]
            },
            description: "Filters messages by processing status PENDING."
          },
          response: []
        },
        {
          name: "List Messages - Filter by Status (COMPLETED)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?status=COMPLETED&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("status", "COMPLETED", "Filter status: PENDING, PROCESSING, COMPLETED, FAILED"),
                createQueryParam("all", "true", "Return all matching messages")
              ]
            },
            description: "Filters messages by processing status COMPLETED."
          },
          response: []
        },
        {
          name: "List Messages - Search Message Text",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/api/v1/messages?search=renewal&all=true",
              host: ["{{baseUrl}}"],
              path: ["api", "v1", "messages"],
              query: [
                createQueryParam("search", "renewal", "Keyword search message content or status"),
                createQueryParam("all", "true", "Return all search results")
              ]
            },
            description: "Searches message text or status by keyword."
          },
          response: []
        }
      ]
    }
  ]
};

const jsonContent = JSON.stringify(collection, null, 2);

// Save to docs/ directory
const docsPath = path.join(__dirname, '..', 'docs', 'Insurance_Policy_Management.postman_collection.json');
fs.writeFileSync(docsPath, jsonContent, 'utf8');

// Also save to root directory for immediate access
const rootPath = path.join(__dirname, '..', 'Insurance_Policy_Management.postman_collection.json');
fs.writeFileSync(rootPath, jsonContent, 'utf8');

const simpleRootPath = path.join(__dirname, '..', 'postman_collection.json');
fs.writeFileSync(simpleRootPath, jsonContent, 'utf8');

console.log('Postman collection successfully generated and formatted with all endpoints!');
console.log('Total items across folders:');
let totalRequests = 0;
collection.item.forEach((folder, idx) => {
  totalRequests += folder.item.length;
  console.log(` ${idx + 1}. ${folder.name}: ${folder.item.length} requests`);
});
console.log(`\nGrand Total: ${totalRequests} pre-configured requests!`);
