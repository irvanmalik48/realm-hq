export interface GranularPermission {
  id: string;
  label: string;
  description: string;
  category: string;
}

export interface PermissionCategory {
  name: string;
  description: string;
  permissions: GranularPermission[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Articles & Editorial",
    description: "Manage blog posts, publication status, and editorial content",
    permissions: [
      {
        id: "posts:write",
        label: "Write & Edit Articles",
        description: "Draft, edit, and update markdown blog posts",
        category: "Articles & Editorial",
      },
      {
        id: "posts:delete",
        label: "Delete Articles",
        description: "Permanently delete blog posts",
        category: "Articles & Editorial",
      },
      {
        id: "posts:publish",
        label: "Publish Articles",
        description:
          "Toggle article publication status between draft and public",
        category: "Articles & Editorial",
      },
    ],
  },
  {
    name: "Platform Users",
    description: "Manage registered members, accounts, and directory access",
    permissions: [
      {
        id: "users:read",
        label: "View User Directory",
        description:
          "Browse platform users, profiles, and connected OAuth providers",
        category: "Platform Users",
      },
      {
        id: "users:manage",
        label: "Manage & Delete Users",
        description: "Promote accounts, update roles, or purge user accounts",
        category: "Platform Users",
      },
    ],
  },
  {
    name: "Community & Feedback",
    description:
      "Moderate user comments, post reactions, and contact inquiries",
    permissions: [
      {
        id: "comments:moderate",
        label: "Moderate Comments",
        description: "Review, edit, and moderate community discussion comments",
        category: "Community & Feedback",
      },
      {
        id: "comments:delete",
        label: "Delete Comments",
        description: "Purge abusive or spam comment threads",
        category: "Community & Feedback",
      },
      {
        id: "reactions:manage",
        label: "Manage Reactions",
        description: "Inspect and moderate post reactions across articles",
        category: "Community & Feedback",
      },
      {
        id: "messages:read",
        label: "Read Contact Messages",
        description: "Access inbox of contact submissions and inquiries",
        category: "Community & Feedback",
      },
      {
        id: "messages:delete",
        label: "Delete Contact Messages",
        description: "Remove resolved or spam contact form submissions",
        category: "Community & Feedback",
      },
    ],
  },
  {
    name: "Storage & Media Assets",
    description:
      "Upload, optimize, and delete media files and Zstd storage blobs",
    permissions: [
      {
        id: "storage:write",
        label: "Upload & Process Media",
        description:
          "Upload files, convert images to WebP, and write Zstd blobs",
        category: "Storage & Media Assets",
      },
      {
        id: "storage:delete",
        label: "Delete Storage Blobs",
        description: "Purge uploaded media assets and storage files",
        category: "Storage & Media Assets",
      },
    ],
  },
  {
    name: "Security Governance",
    description:
      "Control administrative RBAC roles and programmatic API tokens",
    permissions: [
      {
        id: "tokens:manage",
        label: "Manage API Tokens",
        description: "Issue, inspect, and revoke programmatic API tokens",
        category: "Security Governance",
      },
      {
        id: "admins:manage",
        label: "Manage Admin Roles",
        description:
          "Assign, modify, and revoke administrator RBAC permissions",
        category: "Security Governance",
      },
    ],
  },
  {
    name: "Observability & Telemetry",
    description:
      "Access analytics metrics, runtime health, and structured audit logs",
    permissions: [
      {
        id: "analytics:read",
        label: "View Analytics Data",
        description:
          "Access visitor counts, telemetry events, and analytics dashboards",
        category: "Observability & Telemetry",
      },
      {
        id: "system:telemetry",
        label: "Inspect Telemetry & DBPool",
        description:
          "Inspect DB pool metrics, Pyroscope profiling, and runtime health",
        category: "Observability & Telemetry",
      },
      {
        id: "logs:delete",
        label: "Purge System Logs",
        description: "Truncate structured audit logs and trace histories",
        category: "Observability & Telemetry",
      },
    ],
  },
];

export const ALL_AVAILABLE_PERMISSIONS: GranularPermission[] =
  PERMISSION_CATEGORIES.flatMap((c) => c.permissions);

export const PERMISSION_MAP: Record<string, GranularPermission> =
  ALL_AVAILABLE_PERMISSIONS.reduce(
    (acc, p) => {
      acc[p.id] = p;
      return acc;
    },
    {} as Record<string, GranularPermission>,
  );

export function getPermissionLabel(id: string): string {
  return PERMISSION_MAP[id]?.label || id;
}

export function getPermissionDescription(id: string): string {
  return PERMISSION_MAP[id]?.description || id;
}
