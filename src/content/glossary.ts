import type { GlossaryTerm } from './types';

/**
 * The technologies the answer check verifies: a sentence that names one must
 * cite a passage that names it too. The first list is what the architecture
 * overview names; the second is what a writer might plausibly invent for a
 * platform like this one — none of them appears in any article, so a
 * sentence naming one can never pass, and a question naming only these is
 * not covered. Tests hold both lists to the pinned overview.
 */
export const namedTechnologies: GlossaryTerm[] = [
  { id: 'csharp', label: 'C#', aliases: ['C#'] },
  { id: 'dotnet', label: '.NET', aliases: ['.NET'] },
  { id: 'aspnet-core', label: 'ASP.NET Core', aliases: ['ASP.NET Core'] },
  { id: 'blazor', label: 'Blazor', aliases: ['Blazor'] },
  { id: 'signalr', label: 'SignalR', aliases: ['SignalR'] },
  { id: 'razor', label: 'Razor', aliases: ['Razor'] },
  { id: 'httpclient', label: 'HttpClient', aliases: ['HttpClient'] },
  { id: 'webrtc', label: 'WebRTC', aliases: ['WebRTC'] },
  { id: 'javascript', label: 'JavaScript', aliases: ['JavaScript'] },
  { id: 'ef-core', label: 'EF Core', aliases: ['EF Core'] },
  { id: 'sql-server', label: 'SQL Server', aliases: ['SQL Server'] },
  { id: 'azure-sql', label: 'Azure SQL', aliases: ['Azure SQL Database', 'Azure SQL'] },
  { id: 'sqlite', label: 'SQLite', aliases: ['SQLite'] },
  { id: 'azure', label: 'Azure', aliases: ['Azure'] },
  { id: 'azure-openai', label: 'Azure OpenAI', aliases: ['Azure OpenAI'] },
  { id: 'azure-openai-realtime', label: 'Azure OpenAI Realtime', aliases: ['Azure OpenAI Realtime'] },
  { id: 'azure-ai-search', label: 'Azure AI Search', aliases: ['Azure AI Search'] },
  { id: 'document-intelligence', label: 'Azure Document Intelligence', aliases: ['Azure Document Intelligence', 'Document Intelligence'] },
  { id: 'microsoft-foundry', label: 'Microsoft Foundry', aliases: ['Microsoft Foundry'] },
  { id: 'anthropic-claude', label: 'Anthropic Claude', aliases: ['Anthropic Claude', 'Anthropic', 'Claude'] },
  { id: 'google-gemini', label: 'Google Gemini', aliases: ['Google Gemini', 'Gemini'] },
  { id: 'agent-framework', label: 'Microsoft Agent Framework', aliases: ['Microsoft Agent Framework', 'Agent Framework'] },
  { id: 'app-service', label: 'Azure App Service', aliases: ['Azure App Service', 'App Services', 'App Service'] },
  { id: 'key-vault', label: 'Azure Key Vault', aliases: ['Azure Key Vault', 'Key Vault'] },
  { id: 'blob-storage', label: 'Azure Blob Storage', aliases: ['Azure Blob Storage', 'Blob Storage'] },
  { id: 'powershell', label: 'PowerShell', aliases: ['PowerShell'] },
  { id: 'xunit', label: 'xUnit', aliases: ['xUnit'] },
  { id: 'node', label: 'Node', aliases: ['Node'] },
  { id: 'github-actions', label: 'GitHub Actions', aliases: ['GitHub Actions'] },
  { id: 'oidc', label: 'OIDC', aliases: ['OIDC'] },
  { id: 'hsts', label: 'HSTS', aliases: ['HSTS'] },
  { id: 'linux', label: 'Linux', aliases: ['Linux'] },
  { id: 'csv', label: 'CSV', aliases: ['CSV'] },
  { id: 'xlsx', label: 'XLSX', aliases: ['XLSX'] },
];

export const unnamedTechnologies: GlossaryTerm[] = [
  { id: 'kubernetes', label: 'Kubernetes', aliases: ['Kubernetes', 'K8s'] },
  { id: 'docker', label: 'Docker', aliases: ['Docker'] },
  { id: 'aws', label: 'AWS', aliases: ['Amazon Web Services', 'AWS'] },
  { id: 'amazon-bedrock', label: 'Amazon Bedrock', aliases: ['Amazon Bedrock', 'Bedrock'] },
  { id: 'google-cloud', label: 'Google Cloud', aliases: ['Google Cloud', 'GCP'] },
  { id: 'postgresql', label: 'PostgreSQL', aliases: ['PostgreSQL', 'Postgres'] },
  { id: 'mysql', label: 'MySQL', aliases: ['MySQL'] },
  { id: 'mongodb', label: 'MongoDB', aliases: ['MongoDB'] },
  { id: 'redis', label: 'Redis', aliases: ['Redis'] },
  { id: 'kafka', label: 'Kafka', aliases: ['Kafka'] },
  { id: 'rabbitmq', label: 'RabbitMQ', aliases: ['RabbitMQ'] },
  { id: 'elasticsearch', label: 'Elasticsearch', aliases: ['Elasticsearch'] },
  { id: 'react', label: 'React', aliases: ['React'] },
  { id: 'angular', label: 'Angular', aliases: ['Angular'] },
  { id: 'python', label: 'Python', aliases: ['Python'] },
  { id: 'java', label: 'Java', aliases: ['Java'] },
  { id: 'terraform', label: 'Terraform', aliases: ['Terraform'] },
  { id: 'langchain', label: 'LangChain', aliases: ['LangChain'] },
  { id: 'salesforce', label: 'Salesforce', aliases: ['Salesforce'] },
  { id: 'sap', label: 'SAP', aliases: ['SAP'] },
  { id: 'stripe', label: 'Stripe', aliases: ['Stripe'] },
  { id: 'shopify', label: 'Shopify', aliases: ['Shopify'] },
];

export const glossary: GlossaryTerm[] = [...namedTechnologies, ...unnamedTechnologies];
