# Configuration and Data Schemas

## Data Structure Definitions

### Case Object Schema
```javascript
{
  caseId: string,           // Unique identifier (required)
  caseName: string,         // Human-readable name (required)
  version: "1.1",           // Data version (required, must be "1.1")
  caseData: {               // Comprehensive case information
    caseNumber: string,     // Official case number
    court: string,          // Court name and jurisdiction
    judge: string,          // Presiding judge
    filingDate: string,     // ISO date string when case was filed
    plaintiff: string,      // Plaintiff name
    defendants: Array<string>, // Array of defendant names
    caseType: string,       // Type of case (e.g., "Civil Rights - Medical Negligence")
    jurisdiction: string,   // Federal, State, or Local
    venue: string,          // Court venue/division
    status: string,         // Active, Pending, Settled, Closed, Appealed
    discoveryDeadline: string, // ISO date string for discovery deadline
    trialDate: string       // ISO date string for trial date
  },
  requestLetters: Array,    // Array of request letter objects
  createdAt?: string,       // ISO date string
  updatedAt?: string        // ISO date string
}
```

### Request Letter Schema
```javascript
{
  id: string,               // Unique letter identifier (required)
  dateAdded: string,        // ISO date string (required)
  description: string,      // Human-readable description (required)
  requests: Array,          // Array of request objects (required)
  fileName?: string,        // Original uploaded file name
  filePath?: string         // Path to stored file
}
```

### Request Object Schema
```javascript
{
  id: number,               // Request number (required)
  text: string,             // Full request text (required)
  objection: string|null,   // Opponent's objection text
  reply: string|null,       // Our AI-generated response
  status?: string,          // Status: 'pending', 'objected', 'replied'
  createdAt?: string,       // ISO date string
  updatedAt?: string        // ISO date string
}
```

### Response Letter Version Schema
```javascript
{
  id: number,               // Unique version identifier (auto-increment)
  letterId: string,         // Associated request letter ID (required)
  caseId: string,           // Associated case ID (required)
  content: string,          // HTML content of the generated letter (required)
  generatedAt: string,      // ISO date string when generated (required)
  description: string,      // Human-readable description (e.g., "Version 1", "Updated with new objections")
  stats: {                  // Statistics at time of generation
    totalRequests: number,
    withObjections: number,
    withResponses: number,
    pending: number
  }
}
```

### User Profile Schema
```javascript
{
  name: string,             // Full name
  title: string,            // Job title
  email: string,            // Email address
  phone: string,            // Phone number
  org: string,              // Organization name
  orgAddress: string,       // Organization address
  barNumber: string,        // Bar number
  signature: string,        // Default signature block
  apiKey: string,           // Gemini API key (encrypted)
  firmName?: string,        // Law firm name
  firmAddress?: string,     // Law firm address
  firmContact?: string,     // Law firm contact info
  firmWeb?: string          // Law firm website
}
```

### Objection Library Schema
```javascript
{
  [objectionType: string]: {
    argument: string,        // Standard legal argument
    cases: Array<string>     // Supporting case citations
  }
}
```

### User Strategy Map Schema
```javascript
{
  [objectionType: string]: Array<{
    argument: string,        // Custom legal argument
    cases: Array<string>,    // Supporting case citations
    usageCount: number       // Number of times used
  }>
}
```

## Configuration Files

### objectionLibrary.json
Contains standard legal objection templates used by the AI system.

**Location**: Root directory
**Format**: JSON
**Purpose**: Provides default legal arguments for common objections

**Example**:
```json
{
  "vague": {
    "argument": "A party making a vagueness objection bears the burden...",
    "cases": ["Moss v. Blue Cross & Blue Shield of Kan., Inc., 241 F.R.D. 683, 696 (D.Kan.2007)"]
  }
}
```

### prompts.js
Contains AI prompt templates for various operations.

**Location**: Root directory
**Format**: JavaScript module
**Purpose**: Defines prompts for AI interactions

**Key Functions**:
- `extractionPrompt()` - Extract objections from documents
- `deconstructorPrompt()` - Analyze objection types
- `drafterPrompt()` - Generate legal responses
- `requestExtractionPrompt()` - Extract requests from documents
- `headerPrompt()` - Generate letter headers
- `requestPrompt()` - Generate request sections
- `conclusionPrompt()` - Generate letter conclusions

### user_strategy_map.json
Contains user-customized legal strategies.

**Location**: Root directory
**Format**: JSON
**Purpose**: Override default objection library with user preferences

## Environment Variables

### .env (if used)
```bash
# AI Configuration
GEMINI_API_KEY=your_api_key_here

# Application Configuration
NODE_ENV=development
DEBUG=true

# File Paths
USER_DATA_PATH=/path/to/user/data
BACKUP_PATH=/path/to/backups
```

## File Paths and Storage

### User Data Directory Structure
```
userData/
├── case_data/              # Case data storage
│   ├── case-id-1/
│   │   ├── case.json       # Main case data
│   │   └── versions/       # Version history
│   └── case-id-2/
├── backups/                # Automatic backups
├── user_profile.json       # User settings
└── logs/                   # Application logs
```

### Data File Locations
- **Case Data**: `app.getPath('userData')/case_data/`
- **Backups**: `app.getPath('userData')/backups/`
- **User Profile**: `app.getPath('userData')/user_profile.json`
- **Logs**: `app.getPath('userData')/logs/`

## Validation Rules

### Case ID Validation
- Must be unique across all cases
- Format: lowercase, hyphens, alphanumeric only
- Length: 3-50 characters
- Cannot be empty or null

### Request ID Validation
- Must be a positive integer
- Must be unique within a letter
- Cannot be null or undefined

### Date Validation
- Must be ISO 8601 format (YYYY-MM-DD)
- Cannot be in the future
- Cannot be before 1900

### Text Field Validation
- Maximum length: 10,000 characters
- Cannot be empty strings (use null instead)
- Must be valid UTF-8

### API Key Validation
- Must be valid Gemini API key format
- Cannot be empty
- Should be stored securely (not logged)

## Migration Support

### Version History
- **Current version**: `1.1` (current data format)
- **Stored in case data as `version` field**
- **Version field automatically added to cases without it**

### Migration Rules
- Version 1.1 format is the current standard
- Cases without version field are automatically updated
- Full backward compatibility maintained
- New installations start with version 1.1 format

## Error Handling

### Required Error Responses
```javascript
{
  success: boolean,         // Always include
  error?: string,          // Error message if success: false
  data?: any,              // Response data if success: true
  code?: string            // Error code for programmatic handling
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `PERMISSION_DENIED` - Access denied
- `API_ERROR` - External API failure
- `FILE_ERROR` - File operation failure
- `NETWORK_ERROR` - Network connectivity issue

## Security Considerations

### Sensitive Data
- API keys should never be logged
- User data should be encrypted at rest
- File paths should be validated
- Input should be sanitized

### File Operations
- Validate file types before processing
- Limit file sizes
- Sanitize file names
- Use secure file paths

### Data Access
- Validate user permissions
- Sanitize all inputs
- Use parameterized queries
- Implement rate limiting 